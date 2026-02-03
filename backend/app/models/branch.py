"""
Branch/Service Location Model
"""
from datetime import datetime, time
from sqlalchemy import Column, String, Boolean, DateTime, Text, Float, Time, JSON, Integer
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Branch(Base):
    """Service location/branch model"""
    __tablename__ = "branches"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Basic info
    name = Column(String(255), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    
    # Address
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    emirate = Column(String(100), nullable=False)
    
    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Contact
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    
    # Operating hours
    opens_at = Column(Time, default=time(8, 0))
    closes_at = Column(Time, default=time(20, 0))
    working_days = Column(JSON, default=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])
    
    # Capabilities
    has_pickup_service = Column(Boolean, default=True)
    has_ac_service = Column(Boolean, default=True)
    has_body_shop = Column(Boolean, default=False)
    max_daily_capacity = Column(Integer, default=20)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    staff = relationship("User", back_populates="branch")
    job_cards = relationship("JobCard", back_populates="branch")
    
    def __repr__(self):
        return f"<Branch {self.name} ({self.code})>"
