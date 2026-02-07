"""
Vehicle Model
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Vehicle(Base):
    """Customer vehicle model"""
    __tablename__ = "vehicles"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    owner_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    # Vehicle details
    plate_number = Column(String(20), nullable=False, index=True)
    make = Column(String(100), nullable=False)  # Toyota, Honda, etc.
    model = Column(String(100), nullable=False)  # Camry, Civic, etc.
    year = Column(Integer, nullable=True)
    color = Column(String(50), nullable=True)
    vin = Column(String(50), nullable=True)  # Vehicle Identification Number
    chassis_number = Column(String(100), nullable=True)
    engine_number = Column(String(100), nullable=True)
    engine_capacity = Column(String(50), nullable=True)
    cylinders = Column(Integer, nullable=True)
    fuel_type = Column(String(50), nullable=True)
    transmission = Column(String(50), nullable=True)
    origin = Column(String(100), nullable=True)  # GCC, Japan, etc.
    body_type = Column(String(100), nullable=True)
    
    # Registration
    mulkiya_number = Column(String(50), nullable=True)
    mulkiya_url = Column(String(500), nullable=True)  # Document upload
    mulkiya_expiry = Column(DateTime, nullable=True)
    registration_date = Column(DateTime, nullable=True)
    
    # Insurance
    insurance_company = Column(String(255), nullable=True)
    insurance_policy = Column(String(100), nullable=True)
    insurance_expiry = Column(DateTime, nullable=True)
    
    # Additional info
    current_mileage = Column(Integer, nullable=True)
    weight = Column(Integer, nullable=True)
    seating_capacity = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", foreign_keys=[organization_id])
    owner = relationship("User", back_populates="vehicles")
    job_cards = relationship("JobCard", back_populates="vehicle")
    
    def __repr__(self):
        return f"<Vehicle {self.plate_number} - {self.make} {self.model}>"
