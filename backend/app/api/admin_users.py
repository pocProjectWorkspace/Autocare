"""
Admin User Management API - CRUD for Staff Roles
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID

from app.core.deps import get_db, get_current_user, require_role
from app.models import User, Branch

router = APIRouter(tags=["Admin - Users"])


class UserCreate(BaseModel):
    full_name: str
    mobile: str
    email: Optional[EmailStr] = None
    role: str  # admin, service_advisor, technician, driver, vendor
    branch_id: Optional[str] = None
    send_welcome: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    full_name: str
    mobile: str
    email: Optional[str]
    role: str
    branch_id: Optional[str]
    branch_name: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    pages: int


STAFF_ROLES = ["admin", "service_advisor", "technician", "driver", "vendor", "qc_inspector"]


@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: Optional[str] = None,
    branch_id: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """List all staff users with filtering"""
    query = db.query(User).filter(User.role != "customer")
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    if role:
        query = query.filter(User.role == role)
    if branch_id:
        query = query.filter(User.branch_id == branch_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.mobile.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return UserListResponse(
        users=[UserResponse(
            id=str(u.id),
            full_name=u.full_name,
            mobile=u.mobile,
            email=u.email,
            role=u.role,
            branch_id=str(u.branch_id) if u.branch_id else None,
            branch_name=u.branch.name if u.branch else None,
            is_active=u.is_active,
            created_at=u.created_at,
            last_login=u.last_login
        ) for u in users],
        total=total,
        page=page,
        pages=(total + page_size - 1) // page_size
    )


@router.post("/users", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Create a new staff user"""
    # Validate role
    if data.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {STAFF_ROLES}")
    
    # Check if mobile already exists
    existing = db.query(User).filter(User.mobile == data.mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this mobile already exists")
    
    # Validate branch if specified
    branch = None
    if data.branch_id:
        branch = db.query(Branch).filter(Branch.id == data.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
    
    # Create user
    user = User(
        full_name=data.full_name,
        mobile=data.mobile,
        email=data.email,
        role=data.role,
        branch_id=data.branch_id,
        organization_id=current_user.organization_id,
        is_active=True,
        is_verified=True  # Staff are pre-verified
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # TODO: Send welcome SMS/email with login instructions
    if data.send_welcome:
        pass  # Implement notification
    
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        mobile=user.mobile,
        email=user.email,
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
        branch_name=branch.name if branch else None,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get user details"""
    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        mobile=user.mobile,
        email=user.email,
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
        branch_name=user.branch.name if user.branch else None,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Update user details"""
    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-deactivation
    if str(current_user.id) == user_id and data.is_active == False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    # Update fields
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email
    if data.role is not None:
        if data.role not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role")
        user.role = data.role
    if data.branch_id is not None:
        if data.branch_id:
            branch = db.query(Branch).filter(Branch.id == data.branch_id).first()
            if not branch:
                raise HTTPException(status_code=400, detail="Branch not found")
        user.branch_id = data.branch_id if data.branch_id else None
    if data.is_active is not None:
        user.is_active = data.is_active
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        mobile=user.mobile,
        email=user.email,
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
        branch_name=user.branch.name if user.branch else None,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete/deactivate a user"""
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete - just deactivate
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "User deactivated successfully"}


@router.post("/users/{user_id}/reset-access")
async def reset_user_access(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Reset user's OTP/access - send new login OTP"""
    query = db.query(User).filter(User.id == user_id)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In production, send OTP to user's mobile
    # For demo, just return success
    return {
        "message": f"Login OTP sent to {user.mobile}",
        "demo_otp": "123456"  # Remove in production
    }


@router.get("/users/stats/summary")
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get user statistics summary"""
    org_id = current_user.organization_id

    def base_q():
        q = db.query(User)
        if org_id:
            q = q.filter(User.organization_id == org_id)
        return q

    total_staff = base_q().filter(User.role != "customer").count()
    total_customers = base_q().filter(User.role == "customer").count()
    active_staff = base_q().filter(
        User.role != "customer",
        User.is_active == True
    ).count()

    # Count by role
    role_q = db.query(
        User.role,
        func.count(User.id).label("count")
    )
    if org_id:
        role_q = role_q.filter(User.organization_id == org_id)
    role_counts = role_q.group_by(User.role).all()
    
    return {
        "total_staff": total_staff,
        "total_customers": total_customers,
        "active_staff": active_staff,
        "inactive_staff": total_staff - active_staff,
        "by_role": {r.role: r.count for r in role_counts}
    }


@router.post("/users/bulk-create")
async def bulk_create_users(
    users: List[UserCreate] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Create multiple users at once"""
    created = []
    errors = []
    
    for idx, user_data in enumerate(users):
        try:
            # Check existing
            if db.query(User).filter(User.mobile == user_data.mobile).first():
                errors.append({"index": idx, "mobile": user_data.mobile, "error": "Already exists"})
                continue
            
            user = User(
                full_name=user_data.full_name,
                mobile=user_data.mobile,
                email=user_data.email,
                role=user_data.role,
                branch_id=user_data.branch_id,
                organization_id=current_user.organization_id,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            created.append(user_data.mobile)
        except Exception as e:
            errors.append({"index": idx, "mobile": user_data.mobile, "error": str(e)})
    
    db.commit()
    
    return {
        "created": len(created),
        "errors": len(errors),
        "created_mobiles": created,
        "error_details": errors
    }
