"""
Authentication Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.user import (
    OTPRequest, OTPVerify, RegisterRequest, TokenResponse,
    RefreshTokenRequest, UserResponse, UserUpdate
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-otp")
async def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    """Request OTP for login or registration"""
    service = AuthService(db)
    otp = service.request_otp(data.mobile, data.purpose)
    # In production, don't return OTP - it should be sent via SMS
    return {"message": "OTP sent successfully", "otp": otp}  # Remove otp in production


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and login"""
    service = AuthService(db)
    return service.login(data.mobile, data.otp)


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register new customer"""
    service = AuthService(db)
    return service.register(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token"""
    service = AuthService(db)
    return service.refresh_token(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
