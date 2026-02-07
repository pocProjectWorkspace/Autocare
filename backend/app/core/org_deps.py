"""
Organization dependency helpers
"""
from uuid import UUID
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.organization import Organization


def get_org_id(user: User) -> Optional[UUID]:
    """Extract org_id from current user. Returns None if user has no org."""
    return user.organization_id


def require_org(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UUID:
    """Dependency that requires the user to belong to an active organization.
    Returns the organization_id."""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any organization"
        )

    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id,
        Organization.is_active == True
    ).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization is inactive or not found"
        )

    return current_user.organization_id
