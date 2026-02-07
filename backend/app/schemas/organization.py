"""
Organization Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")
    logo_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    max_branches: Optional[int] = None
    max_users: Optional[int] = None


class OrganizationSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    owner_id: Optional[UUID] = None
    logo_url: Optional[str] = None
    subscription_plan: str
    subscription_status: str
    trial_ends_at: Optional[datetime] = None
    settings: Optional[Dict[str, Any]] = None
    max_branches: int
    max_users: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
