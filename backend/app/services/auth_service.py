"""
Authentication Service
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, UserRole, OTPCode
from app.schemas.user import RegisterRequest, UserCreate, TokenResponse, UserResponse
from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    generate_otp, get_password_hash, verify_password
)
from app.core.config import settings


class AuthService:
    """Authentication service for OTP-based login"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def request_otp(self, mobile: str, purpose: str = "login") -> str:
        """Generate and store OTP for a mobile number"""
        # Check if user exists for login
        user = self.db.query(User).filter(User.mobile == mobile).first()
        
        if purpose == "login" and not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. Please register first."
            )
        
        if purpose == "register" and user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered. Please login."
            )
        
        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        # Invalidate previous OTPs
        self.db.query(OTPCode).filter(
            OTPCode.mobile == mobile,
            OTPCode.is_used == False
        ).update({"is_used": True})
        
        # Store new OTP
        otp_record = OTPCode(
            mobile=mobile,
            code=otp,
            purpose=purpose,
            user_id=user.id if user else None,
            expires_at=expires_at
        )
        self.db.add(otp_record)
        self.db.commit()
        
        # In production, send OTP via SMS/WhatsApp
        # For development, we'll return it in the response
        print(f"OTP for {mobile}: {otp}")  # Dev only
        
        return otp  # In production, don't return this!
    
    def verify_otp(self, mobile: str, otp: str) -> Tuple[bool, Optional[User]]:
        """Verify OTP and return user if valid"""
        
        # DEV MODE: Accept 123456 as valid OTP for testing
        if settings.DEBUG and otp == "123456":
            user = self.db.query(User).filter(User.mobile == mobile).first()
            return True, user
        
        otp_record = self.db.query(OTPCode).filter(
            OTPCode.mobile == mobile,
            OTPCode.code == otp,
            OTPCode.is_used == False,
            OTPCode.expires_at > datetime.utcnow()
        ).first()
        
        if not otp_record:
            return False, None
        
        # Mark OTP as used
        otp_record.is_used = True
        self.db.commit()
        
        # Get user
        user = self.db.query(User).filter(User.mobile == mobile).first()
        return True, user
    
    def login(self, mobile: str, otp: str) -> TokenResponse:
        """Login with OTP"""
        valid, user = self.verify_otp(mobile, otp)
        
        if not valid or not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Generate tokens
        access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    
    def register(self, data: RegisterRequest) -> TokenResponse:
        """Register new customer"""
        # Verify OTP
        valid, _ = self.verify_otp(data.mobile, data.otp)
        
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP"
            )
        
        # Check if mobile already registered
        existing = self.db.query(User).filter(User.mobile == data.mobile).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number already registered"
            )
        
        # Create user
        user = User(
            full_name=data.full_name,
            mobile=data.mobile,
            email=data.email,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Generate tokens
        access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    
    def refresh_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token"""
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new tokens
        new_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
        new_refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            user=UserResponse.model_validate(user)
        )
