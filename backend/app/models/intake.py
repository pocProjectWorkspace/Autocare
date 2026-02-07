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
    performed_by_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    # Meter readings
    fuel_level = Column(String(20), nullable=True)  # e.g. "1/4", "Full"
    odometer_reading = Column(Integer, nullable=True)

    # Checklist
    has_spare_tyre = Column(Boolean, default=True)
    has_jack = Column(Boolean, default=True)
    has_service_book = Column(Boolean, default=True)
    toolkit = Column(Boolean, default=False)
    floor_mats = Column(Boolean, default=False)
    first_aid_kit = Column(Boolean, default=False)
    fire_extinguisher = Column(Boolean, default=False)

    # Exterior
    exterior_damages = Column(JSON, nullable=True)  # Map of parts and damage types
    exterior_photos = Column(JSON, default=list)
    exterior_notes = Column(Text, nullable=True)

    # Interior
    interior_photos = Column(JSON, default=list)
    interior_condition = Column(JSON, nullable=True)
    interior_notes = Column(Text, nullable=True)

    # Items in vehicle
    items_in_vehicle = Column(JSON, default=list)
    items_photos = Column(JSON, default=list)

    media_urls = Column(JSON, default=list)  # General photos of vehicle during intake
    customer_acknowledged = Column(Boolean, default=False)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job_card = relationship("JobCard", back_populates="intake")
    performed_by = relationship("User")


class Diagnosis(Base):
    """Technical diagnosis by technician"""
    __tablename__ = "diagnoses"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False, unique=True)
    technician_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    findings = Column(Text, nullable=False)
    recommended_repairs = Column(Text, nullable=True)
    severity = Column(String(20), nullable=True)  # low, medium, high, critical

    # Media
    diagnostic_photos = Column(JSON, default=list)
    diagnostic_videos = Column(JSON, default=list)
    media_urls = Column(JSON, default=list)  # General media

    # Estimates
    requires_parts = Column(Boolean, default=False)
    estimated_labour_hours = Column(Float, nullable=True)
    estimated_completion_days = Column(Integer, nullable=True)

    is_critical_safety_issue = Column(Boolean, default=False)
    diagnosed_at = Column(DateTime, nullable=True)
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
