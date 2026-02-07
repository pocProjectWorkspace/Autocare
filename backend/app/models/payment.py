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
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    ONLINE = "online"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
    PAYMENT_LINK = "payment_link"


class PaymentType(str, enum.Enum):
    DEPOSIT = "deposit"
    FINAL = "final"
    FULL = "full"
    BALANCE = "balance"
    REFUND = "refund"


class Payment(Base):
    """Payment transactions"""
    __tablename__ = "payments"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    payment_number = Column(String(50), unique=True, nullable=True, index=True)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=True)  # who made payment
    collected_by_id = Column(UUID, ForeignKey("users.id"), nullable=True)  # staff who collected

    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="AED")

    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_type = Column(Enum(PaymentType), default=PaymentType.FULL)

    # Provider info (Stripe, etc.)
    provider = Column(String(50), nullable=True)
    transaction_reference = Column(String(255), nullable=True, unique=True)
    gateway_transaction_id = Column(String(255), nullable=True)
    gateway_response = Column(JSON, nullable=True)
    payment_link_url = Column(String(500), nullable=True)
    payment_link_expires = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)

    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", foreign_keys=[organization_id])
    job_card = relationship("JobCard", back_populates="payments")
    user = relationship("User", foreign_keys=[user_id])
    collected_by = relationship("User", foreign_keys=[collected_by_id])


class Invoice(Base):
    """Generated invoices for tax purposes and customer records"""
    __tablename__ = "invoices"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_type = Column(String(50), nullable=True)  # estimate, proforma, final
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)

    line_items = Column(JSON, nullable=True)  # Detailed line items
    subtotal = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.05)  # UAE VAT 5%
    tax_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0)
    grand_total = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=True)  # Alias for grand_total used by service

    terms = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_paid = Column(Boolean, default=False)

    # PDF generation
    pdf_url = Column(String(500), nullable=True)

    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job_card = relationship("JobCard")
