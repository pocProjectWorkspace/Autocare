"""
Organization Management Routes
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import User, UserRole
from app.models.organization import Organization, SubscriptionPlan, SubscriptionStatus
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate,
    OrganizationSettingsUpdate, OrganizationResponse
)

router = APIRouter(prefix="/org", tags=["Organization"])


@router.post("/register", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def register_organization(
    data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new organization and assign current user as owner + admin"""
    if current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already belongs to an organization"
        )

    # Check slug uniqueness
    existing = db.query(Organization).filter(Organization.slug == data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already taken"
        )

    org = Organization(
        name=data.name,
        slug=data.slug,
        owner_id=current_user.id,
        logo_url=data.logo_url,
        subscription_plan=SubscriptionPlan.FREE,
        subscription_status=SubscriptionStatus.TRIAL,
        trial_ends_at=datetime.utcnow() + timedelta(days=14),
        settings=data.settings or {
            "currency": "AED",
            "tax_rate": 5.0,
            "working_hours": {"open": "08:00", "close": "20:00"},
            "notification_preferences": {"whatsapp": True, "email": True, "push": True}
        },
    )
    db.add(org)
    db.flush()

    # Assign user to org as admin
    current_user.organization_id = org.id
    current_user.role = UserRole.ADMIN
    db.commit()
    db.refresh(org)

    return org


@router.get("/me", response_model=OrganizationResponse)
async def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's organization details"""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not associated with any organization"
        )

    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    return org


@router.put("/me", response_model=OrganizationResponse)
async def update_my_organization(
    data: OrganizationUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update organization details (admin only)"""
    if not current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No organization")

    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)

    org.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(org)

    return org


@router.put("/me/settings", response_model=OrganizationResponse)
async def update_organization_settings(
    data: OrganizationSettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update organization settings JSON (admin only)"""
    if not current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No organization")

    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Merge settings
    current_settings = org.settings or {}
    current_settings.update(data.settings)
    org.settings = current_settings
    org.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(org)

    return org
