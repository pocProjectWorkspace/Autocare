"""
User Model
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey, Index
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User roles in the system"""
    CUSTOMER = "customer"
    SERVICE_ADVISOR = "service_advisor"
    TECHNICIAN = "technician"
    DRIVER = "driver"
    VENDOR = "vendor"
    ADMIN = "admin"


class User(Base):
    """User model for all system users"""
    __tablename__ = "users"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Basic info
    full_name = Column(String(255), nullable=False)
    mobile = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    
    # Authentication
    password_hash = Column(String(255), nullable=True)  # Optional for OTP-only auth
    
    # Role & Status
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)
    emirates_id = Column(String(50), nullable=True)
    emirates_id_url = Column(String(500), nullable=True)
    
    # Organization (tenant)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)

    # For staff - branch assignment
    branch_id = Column(UUID, ForeignKey("branches.id"), nullable=True)
    
    # For vendors
    company_name = Column(String(255), nullable=True)
    trade_license = Column(String(100), nullable=True)
    vendor_rating = Column(String(10), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", foreign_keys=[organization_id])
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    branch = relationship("Branch", back_populates="staff")
    otp_codes = relationship("OTPCode", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.full_name} ({self.role.value})>"


class OTPCode(Base):
    """OTP codes for authentication"""
    __tablename__ = "otp_codes"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    mobile = Column(String(20), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="login")  # login, register, verify
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="otp_codes")
