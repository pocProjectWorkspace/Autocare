"""
Vehicle Intake and Diagnosis Models
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class VehicleIntake(Base):
    """Initial vehicle intake checklist and inspection"""
    __tablename__ = "vehicle_intakes"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False, unique=True)
    advisor_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    # Meter readings
    fuel_level = Column(String(20), nullable=True)  # e.g. "1/4", "Full"
    mileage = Column(Integer, nullable=True)
    
    # Checklist
    has_spare_tyre = Column(Boolean, default=True)
    has_jack = Column(Boolean, default=True)
    has_service_book = Column(Boolean, default=True)
    
    # Exterior damage mapping
    exterior_damage = Column(JSON, nullable=True)  # Map of parts and damage types
    media_urls = Column(JSON, default=list)  # Photos of vehicle during intake
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="intake")
    advisor = relationship("User")


class Diagnosis(Base):
    """Technical diagnosis by technician"""
    __tablename__ = "diagnoses"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False, unique=True)
    technician_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    technical_report = Column(Text, nullable=False)
    recommended_repairs = Column(Text, nullable=True)
    media_urls = Column(JSON, default=list)
    
    is_critical_safety_issue = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="diagnosis")
    technician = relationship("User")


class EstimateItem(Base):
    """Line items in a job estimate/quote"""
    __tablename__ = "estimate_items"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    
    item_type = Column(String(50), nullable=False)  # labour, part, fee
    description = Column(String(500), nullable=False)
    part_number = Column(String(100), nullable=True)
    
    quantity = Column(Float, default=1)
    unit = Column(String(20), default="units")
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    is_approved = Column(Boolean, default=False)
    warranty_months = Column(Integer, nullable=True)
    
    # Linking to RFQ/Order if applicable
    order_item_id = Column(UUID, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="estimate_items")
