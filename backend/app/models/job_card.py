"""
Job Card Model
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class JobStatus(str, enum.Enum):
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    VEHICLE_PICKED = "vehicle_picked"
    IN_INTAKE = "in_intake"
    DIAGNOSED = "diagnosed"
    AWAITING_ESTIMATE_APPROVAL = "awaiting_estimate_approval"
    ESTIMATE_APPROVED = "estimate_approved"
    RFQ_SENT = "rfq_sent"
    QUOTES_RECEIVED = "quotes_received"
    AWAITING_PARTS_APPROVAL = "awaiting_parts_approval"
    PARTS_APPROVED = "parts_approved"
    AWAITING_PAYMENT = "awaiting_payment"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    PARTS_ORDERED = "parts_ordered"
    PARTS_RECEIVED = "parts_received"
    IN_SERVICE = "in_service"
    TESTING = "testing"
    READY = "ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class ServiceType(str, enum.Enum):
    DIAGNOSIS_ONLY = "diagnosis_only"
    MINOR = "minor"
    REGULAR = "regular"
    MAJOR = "major"
    AC_SERVICE = "ac_service"
    ELECTRICAL = "electrical"
    BATTERY = "battery"
    TYRE = "tyre"


class ServiceCategory(str, enum.Enum):
    MECHANICAL = "mechanical"
    ELECTRICAL = "electrical"
    BODY_SHOP = "body_shop"
    DETAILING = "detailing"


class DeliveryType(str, enum.Enum):
    DROP_OFF = "drop_off"
    PICKUP = "pickup"


class JobCard(Base):
    """Main job card model"""
    __tablename__ = "job_cards"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_number = Column(String(20), unique=True, nullable=False, index=True)
    
    # Relationships
    customer_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(UUID, ForeignKey("vehicles.id"), nullable=False)
    branch_id = Column(UUID, ForeignKey("branches.id"), nullable=False)
    service_advisor_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    technician_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    driver_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    
    # Service Info
    service_type = Column(Enum(ServiceType), nullable=False)
    service_category = Column(Enum(ServiceCategory), nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.REQUESTED, nullable=False)
    intake_type = Column(Enum(DeliveryType), default=DeliveryType.DROP_OFF)
    
    # Logistics
    pickup_address = Column(String(500), nullable=True)
    pickup_latitude = Column(Float, nullable=True)
    pickup_longitude = Column(Float, nullable=True)
    preferred_pickup_time = Column(DateTime, nullable=True)
    actual_pickup_time = Column(DateTime, nullable=True)
    
    delivery_type = Column(Enum(DeliveryType), default=DeliveryType.DROP_OFF)
    delivery_address = Column(String(500), nullable=True)
    preferred_delivery_time = Column(DateTime, nullable=True)
    actual_delivery_time = Column(DateTime, nullable=True)
    
    # Timing
    scheduled_date = Column(DateTime, nullable=True)
    estimated_completion_days = Column(Integer, nullable=True)
    estimated_completion_date = Column(DateTime, nullable=True)
    actual_completion_date = Column(DateTime, nullable=True)
    
    # Financials
    labour_total = Column(Float, default=0)
    parts_total = Column(Float, default=0)
    pickup_delivery_fee = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    estimate_total = Column(Float, default=0)
    grand_total = Column(Float, default=0)
    amount_paid = Column(Float, default=0)
    balance_due = Column(Float, default=0)
    
    # Approvals
    estimate_approved_at = Column(DateTime, nullable=True)
    parts_approved_at = Column(DateTime, nullable=True)
    
    # Notes & Media
    customer_notes = Column(Text, nullable=True)
    customer_media_urls = Column(JSON, default=list)
    
    # Feedback
    customer_rating = Column(Integer, nullable=True)
    customer_feedback = Column(Text, nullable=True)
    feedback_submitted_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    vehicle = relationship("Vehicle", back_populates="job_cards")
    branch = relationship("Branch", back_populates="job_cards")
    service_advisor = relationship("User", foreign_keys=[service_advisor_id])
    technician = relationship("User", foreign_keys=[technician_id])
    driver = relationship("User", foreign_keys=[driver_id])
    
    intake = relationship("VehicleIntake", back_populates="job_card", uselist=False)
    diagnosis = relationship("Diagnosis", back_populates="job_card", uselist=False)
    estimate_items = relationship("EstimateItem", back_populates="job_card")
    updates = relationship("JobUpdate", back_populates="job_card", cascade="all, delete-orphan")
    rfqs = relationship("RFQ", back_populates="job_card")
    payments = relationship("Payment", back_populates="job_card")
    work_orders = relationship("WorkOrder", back_populates="job_card")
