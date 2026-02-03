"""
Payment and Invoice Models
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"


class PaymentType(str, enum.Enum):
    DEPOSIT = "deposit"
    FINAL = "final"
    FULL = "full"
    REFUND = "refund"


class Payment(Base):
    """Payment transactions"""
    __tablename__ = "payments"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)  # who made payment
    
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="AED")
    
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    method = Column(Enum(PaymentMethod), nullable=True)
    payment_type = Column(Enum(PaymentType), default=PaymentType.FULL)
    
    # Provider info (Stripe, etc.)
    provider = Column(String(50), nullable=True)
    transaction_reference = Column(String(255), nullable=True, unique=True)
    payment_link = Column(String(500), nullable=True)
    
    notes = Column(Text, nullable=True)
    
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="payments")
    user = relationship("User")


class Invoice(Base):
    """Generated invoices for tax purposes and customer records"""
    __tablename__ = "invoices"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String(50), unique=True, nullable=False)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0)
    grand_total = Column(Float, nullable=False)
    
    # PDF generation
    pdf_url = Column(String(500), nullable=True)
    
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard")
