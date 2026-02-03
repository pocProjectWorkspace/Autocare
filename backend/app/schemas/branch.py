"""
Branch Schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, time
from uuid import UUID


class BranchBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=20)
    address: str
    city: str
    emirate: str


class BranchCreate(BranchBase):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None
    opens_at: Optional[time] = time(8, 0)
    closes_at: Optional[time] = time(20, 0)
    working_days: Optional[List[str]] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    has_pickup_service: bool = True
    has_ac_service: bool = True
    has_body_shop: bool = False
    max_daily_capacity: int = 20


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    emirate: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None
    opens_at: Optional[time] = None
    closes_at: Optional[time] = None
    working_days: Optional[List[str]] = None
    has_pickup_service: Optional[bool] = None
    has_ac_service: Optional[bool] = None
    has_body_shop: Optional[bool] = None
    max_daily_capacity: Optional[int] = None
    is_active: Optional[bool] = None


class BranchResponse(BranchBase):
    id: UUID
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    opens_at: Optional[time] = None
    closes_at: Optional[time] = None
    working_days: Optional[List[str]] = None
    has_pickup_service: bool
    has_ac_service: bool
    has_body_shop: bool
    max_daily_capacity: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class BranchListResponse(BaseModel):
    branches: List[BranchResponse]
    total: int
