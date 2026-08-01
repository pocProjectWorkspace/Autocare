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
from app.models import (
    User, UserRole, Branch, JobCard, JobStatus,
    Payment, PaymentStatus, PaymentMethod, Vehicle,
    RFQ, RFQStatus, VendorQuote
)
from app.schemas.user import StaffCreate, VendorCreate, UserResponse
from app.schemas.reports import DashboardStats, JobStatusSummary
from app.schemas.vehicle import QuickVehicleRegister, VehicleResponse
from app.services.vehicle_lookup_service import vehicle_lookup

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin dashboard statistics"""
    org_id = current_user.organization_id
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    # Base query filtered by org
    def job_q():
        q = db.query(JobCard)
        if org_id:
            q = q.filter(JobCard.organization_id == org_id)
        return q

    def pay_q():
        q = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.COMPLETED)
        if org_id:
            q = q.filter(Payment.organization_id == org_id)
        return q

    total_jobs = job_q().count()
    pending = job_q().filter(JobCard.status.in_([
        JobStatus.REQUESTED, JobStatus.SCHEDULED, JobStatus.AWAITING_ESTIMATE_APPROVAL,
        JobStatus.AWAITING_PARTS_APPROVAL, JobStatus.AWAITING_PAYMENT
    ])).count()
    in_progress = job_q().filter(JobCard.status.in_([
        JobStatus.IN_INTAKE, JobStatus.DIAGNOSED, JobStatus.IN_SERVICE, JobStatus.TESTING
    ])).count()
    completed = job_q().filter(JobCard.status == JobStatus.CLOSED).count()

    today_revenue = pay_q().filter(func.date(Payment.paid_at) == today).scalar() or 0
    month_revenue = pay_q().filter(Payment.paid_at >= month_start).scalar() or 0

    pending_approvals = job_q().filter(JobCard.status.in_([
        JobStatus.AWAITING_ESTIMATE_APPROVAL, JobStatus.AWAITING_PARTS_APPROVAL
    ])).count()

    pending_payments = job_q().filter(
        JobStatus.AWAITING_PAYMENT == JobCard.status
    ).count()

    # Status breakdown
    status_q = db.query(JobCard.status, func.count(JobCard.id)).group_by(JobCard.status)
    if org_id:
        status_q = status_q.filter(JobCard.organization_id == org_id)
    status_counts = status_q.all()
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
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
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
    query = db.query(User).filter(
        User.mobile == mobile,
        User.role == UserRole.CUSTOMER
    )
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    customer = query.first()

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


@router.post("/vehicles/quick-register", response_model=VehicleResponse)
async def quick_register_vehicle(
    data: QuickVehicleRegister,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Quickly register a vehicle and customer on-the-fly"""
    # 1. Find or create customer
    customer = db.query(User).filter(
        User.mobile == data.mobile,
        User.role == UserRole.CUSTOMER
    ).first()
    
    if not customer:
        if not data.customer_name:
             raise HTTPException(status_code=400, detail="Customer name is required for new registration")
        
        customer = User(
            full_name=data.customer_name,
            mobile=data.mobile,
            role=UserRole.CUSTOMER,
            organization_id=current_user.organization_id,
            is_active=True,
            is_verified=True
        )
        db.add(customer)
        db.flush() # Get ID for vehicle association
    
    # 2. Create vehicle with rich data from API or UI
    make = data.make
    model = "Other"
    if " " in data.make:
        parts = data.make.split(" ", 1)
        make = parts[0]
        model = parts[1]

    vehicle = Vehicle(
        organization_id=current_user.organization_id,
        owner_id=customer.id,
        plate_number=data.plate_number,
        make=make,
        model=model,
        year=data.year,
        mulkiya_number=data.mulkiya_number,
        mulkiya_expiry=data.mulkiya_expiry,
        vin=data.vin,
        chassis_number=data.chassis_number,
        engine_number=data.engine_number
    )
    
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    
    return vehicle


@router.get("/vehicles/lookup-plate")
async def lookup_plate(
    plate_number: str,
    emirate: str = "Dubai",
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lookup vehicle details from external UAE vehicle data API"""
    details = await vehicle_lookup.lookup_by_plate(plate_number, emirate)
    if not details:
        raise HTTPException(status_code=404, detail="Vehicle details not found for this plate")
    return details


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
        organization_id=current_user.organization_id,
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
        organization_id=current_user.organization_id,
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
    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.get("/payments")
async def list_payments(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List payments for admin dashboard"""
    org_id = current_user.organization_id
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    query = db.query(Payment).join(
        JobCard, Payment.job_card_id == JobCard.id
    ).outerjoin(
        User, Payment.user_id == User.id
    )
    if org_id:
        query = query.filter(Payment.organization_id == org_id)
    if status:
        query = query.filter(Payment.status == PaymentStatus(status))

    total = query.count()
    offset = (page - 1) * page_size
    payments = query.order_by(Payment.created_at.desc()).offset(offset).limit(page_size).all()

    # Summary stats
    summary_base = db.query(Payment)
    if org_id:
        summary_base = summary_base.filter(Payment.organization_id == org_id)

    today_collection = summary_base.filter(
        Payment.status == PaymentStatus.COMPLETED,
        func.date(Payment.paid_at) == today
    ).with_entities(func.sum(Payment.amount)).scalar() or 0

    pending_count = summary_base.filter(
        Payment.status == PaymentStatus.PENDING
    ).count()

    month_total = summary_base.filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.paid_at >= datetime.combine(month_start, datetime.min.time())
    ).with_entities(func.sum(Payment.amount)).scalar() or 0

    return {
        "payments": [{
            "id": str(p.id),
            "payment_number": p.payment_number or str(p.id)[:8],
            "job_number": p.job_card.job_number if p.job_card else "-",
            "customer_name": p.user.full_name if p.user else "-",
            "amount": p.amount,
            "currency": p.currency,
            "payment_method": p.payment_method.value if p.payment_method else None,
            "status": p.status.value,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in payments],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size,
        "summary": {
            "today_collection": float(today_collection),
            "pending_count": pending_count,
            "month_total": float(month_total),
        }
    }


@router.get("/rfqs")
async def list_rfqs(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List RFQs for admin dashboard"""
    org_id = current_user.organization_id

    query = db.query(RFQ).join(
        JobCard, RFQ.job_card_id == JobCard.id
    )
    if org_id:
        query = query.filter(RFQ.organization_id == org_id)
    if status:
        query = query.filter(RFQ.status == RFQStatus(status))

    total = query.count()
    offset = (page - 1) * page_size
    rfqs = query.order_by(RFQ.created_at.desc()).offset(offset).limit(page_size).all()

    return {
        "rfqs": [{
            "id": str(r.id),
            "rfq_number": r.rfq_number or str(r.id)[:8],
            "job_number": r.job_card.job_number if r.job_card else "-",
            "parts_count": len(r.parts_list) if r.parts_list else 0,
            "vendor_count": len(set(q.vendor_id for q in r.quotes)) if r.quotes else 0,
            "quotes_received": sum(1 for q in r.quotes if q.status.value == "submitted") if r.quotes else 0,
            "status": r.status.value,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rfqs],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/vehicles")
async def list_vehicles(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List vehicles for admin dashboard"""
    org_id = current_user.organization_id

    query = db.query(Vehicle).outerjoin(User, Vehicle.owner_id == User.id)
    if org_id:
        query = query.filter(Vehicle.organization_id == org_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Vehicle.plate_number.ilike(search_term)) |
            (Vehicle.make.ilike(search_term)) |
            (Vehicle.model.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )

    total = query.count()
    offset = (page - 1) * page_size
    vehicles = query.order_by(Vehicle.created_at.desc()).offset(offset).limit(page_size).all()

    result = []
    for v in vehicles:
        job_count = db.query(func.count(JobCard.id)).filter(
            JobCard.vehicle_id == v.id
        ).scalar() or 0

        last_job = db.query(JobCard.created_at).filter(
            JobCard.vehicle_id == v.id
        ).order_by(JobCard.created_at.desc()).first()

        result.append({
            "id": str(v.id),
            "plate_number": v.plate_number,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "owner_name": v.owner.full_name if v.owner else "-",
            "job_count": job_count,
            "last_service_date": last_job[0].isoformat() if last_job else None,
        })

    return {
        "vehicles": result,
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size,
    }
