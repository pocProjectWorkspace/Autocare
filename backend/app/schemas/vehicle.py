"""
Vehicle Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class VehicleBase(BaseModel):
    plate_number: str = Field(..., min_length=1, max_length=20)
    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    color: Optional[str] = None
    vin: Optional[str] = None


class VehicleCreate(VehicleBase):
    mulkiya_url: Optional[str] = None
    mulkiya_number: Optional[str] = None
    mulkiya_expiry: Optional[datetime] = None


class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    vin: Optional[str] = None
    mulkiya_url: Optional[str] = None
    mulkiya_number: Optional[str] = None
    mulkiya_expiry: Optional[datetime] = None
    insurance_company: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    current_mileage: Optional[int] = None
    notes: Optional[str] = None


class VehicleResponse(VehicleBase):
    id: UUID
    owner_id: UUID
    mulkiya_url: Optional[str] = None
    mulkiya_number: Optional[str] = None
    mulkiya_expiry: Optional[datetime] = None
    insurance_company: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    current_mileage: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class VehicleListResponse(BaseModel):
    vehicles: List[VehicleResponse]
    total: int


class QuickVehicleRegister(BaseModel):
    plate_number: str
    make: str
    mulkiya_number: str
    year: int
    mobile: str
