"""
Admin Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import require_admin
from app.models import User, UserRole, Branch, JobCard, JobStatus, Payment, PaymentStatus
from app.schemas.user import StaffCreate, VendorCreate, UserResponse
from app.schemas.reports import DashboardStats, JobStatusSummary

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin dashboard statistics"""
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)
    
    total_jobs = db.query(JobCard).count()
    pending = db.query(JobCard).filter(JobCard.status.in_([
        JobStatus.REQUESTED, JobStatus.SCHEDULED, JobStatus.AWAITING_ESTIMATE_APPROVAL,
        JobStatus.AWAITING_PARTS_APPROVAL, JobStatus.AWAITING_PAYMENT
    ])).count()
    in_progress = db.query(JobCard).filter(JobCard.status.in_([
        JobStatus.IN_INTAKE, JobStatus.DIAGNOSED, JobStatus.IN_SERVICE, JobStatus.TESTING
    ])).count()
    completed = db.query(JobCard).filter(JobCard.status == JobStatus.CLOSED).count()
    
    today_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED,
        func.date(Payment.paid_at) == today
    ).scalar() or 0
    
    month_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.paid_at >= month_start
    ).scalar() or 0
    
    pending_approvals = db.query(JobCard).filter(JobCard.status.in_([
        JobStatus.AWAITING_ESTIMATE_APPROVAL, JobStatus.AWAITING_PARTS_APPROVAL
    ])).count()
    
    pending_payments = db.query(JobCard).filter(
        JobStatus.AWAITING_PAYMENT == JobCard.status
    ).count()
    
    # Status breakdown
    status_counts = db.query(JobCard.status, func.count(JobCard.id)).group_by(JobCard.status).all()
    jobs_by_status = [
        JobStatusSummary(status=s.value, count=c, percentage=round(c/total_jobs*100, 1) if total_jobs else 0)
        for s, c in status_counts
    ]
    
    return DashboardStats(
        total_jobs=total_jobs,
        pending_jobs=pending,
        in_progress_jobs=in_progress,
        completed_jobs=completed,
        today_revenue=today_revenue,
        month_revenue=month_revenue,
        pending_approvals=pending_approvals,
        pending_payments=pending_payments,
        jobs_by_status=jobs_by_status
    )


@router.get("/users")
async def list_users(
    role: Optional[UserRole] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users"""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    
    total = query.count()
    offset = (page - 1) * page_size
    users = query.offset(offset).limit(page_size).all()
    
    return {"users": [UserResponse.model_validate(u) for u in users], "total": total}


@router.get("/customers/lookup")
async def lookup_customer(
    mobile: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lookup customer details and vehicles by mobile number"""
    customer = db.query(User).filter(
        User.mobile == mobile,
        User.role == UserRole.CUSTOMER
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    vehicles = db.query(Vehicle).filter(Vehicle.owner_id == customer.id).all()
    
    return {
        "customer": UserResponse.model_validate(customer),
        "vehicles": [
            {
                "id": str(v.id),
                "plate_number": v.plate_number,
                "make": v.make,
                "model": v.model,
                "year": v.year
            } for v in vehicles
        ]
    }


@router.post("/staff", response_model=UserResponse)
async def create_staff(
    data: StaffCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create staff member"""
    existing = db.query(User).filter(User.mobile == data.mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile already registered")
    
    user = User(
        full_name=data.full_name,
        mobile=data.mobile,
        email=data.email,
        role=data.role,
        branch_id=data.branch_id,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/vendor", response_model=UserResponse)
async def create_vendor(
    data: VendorCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create vendor account"""
    existing = db.query(User).filter(User.mobile == data.mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile already registered")
    
    user = User(
        full_name=data.full_name,
        mobile=data.mobile,
        email=data.email,
        role=UserRole.VENDOR,
        company_name=data.company_name,
        trade_license=data.trade_license,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle user active status"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}
