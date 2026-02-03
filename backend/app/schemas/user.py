"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.user import UserRole


# Base schemas
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    role: UserRole = UserRole.CUSTOMER


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    emirates_id: Optional[str] = None
    emirates_id_url: Optional[str] = None
    company_name: Optional[str] = None  # For vendors


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    emirates_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[UUID] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int


# Auth schemas
class OTPRequest(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=20)
    purpose: str = "login"  # login, register


class OTPVerify(BaseModel):
    mobile: str = Field(..., min_length=10, max_length=20)
    otp: str = Field(..., min_length=4, max_length=10)


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    otp: str = Field(..., min_length=4, max_length=10)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Staff/Vendor creation
class StaffCreate(BaseModel):
    full_name: str
    mobile: str
    email: Optional[EmailStr] = None
    role: UserRole
    branch_id: Optional[UUID] = None


class VendorCreate(BaseModel):
    full_name: str
    mobile: str
    email: Optional[EmailStr] = None
    company_name: str
    trade_license: Optional[str] = None
