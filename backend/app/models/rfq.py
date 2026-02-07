"""
RFQ (Request for Quote) and Parts Procurement Models
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON, Integer
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class RFQStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    SENT = "sent"
    QUOTES_RECEIVED = "quotes_received"
    QUOTE_SELECTED = "quote_selected"
    ORDERED = "ordered"
    CANCELLED = "cancelled"


class QuoteStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    SELECTED = "selected"
    REJECTED = "rejected"
    EXPIRED = "expired"


class RFQ(Base):
    """Request for parts quote from multiple vendors"""
    __tablename__ = "rfqs"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    rfq_number = Column(String(50), unique=True, nullable=True, index=True)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    created_by_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(RFQStatus), default=RFQStatus.PENDING)
    parts_list = Column(JSON, nullable=False)  # List of parts needed with specs

    quote_deadline = Column(DateTime, nullable=True)
    selection_rule = Column(String(50), nullable=True)  # lowest_price, best_delivery, manual
    max_delivery_days = Column(Integer, nullable=True)

    sent_at = Column(DateTime, nullable=True)

    # Quote selection
    selected_quote_id = Column(UUID, ForeignKey("vendor_quotes.id"), nullable=True)
    selected_at = Column(DateTime, nullable=True)
    selected_by_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    selection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job_card = relationship("JobCard", back_populates="rfqs")
    created_by = relationship("User", foreign_keys=[created_by_id])
    selected_by = relationship("User", foreign_keys=[selected_by_id])
    selected_quote = relationship("VendorQuote", foreign_keys=[selected_quote_id], post_update=True)
    quotes = relationship("VendorQuote", back_populates="rfq", cascade="all, delete-orphan", foreign_keys="[VendorQuote.rfq_id]")


class VendorQuote(Base):
    """Quote submitted by a vendor for an RFQ"""
    __tablename__ = "vendor_quotes"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    quote_number = Column(String(50), unique=True, nullable=True, index=True)
    rfq_id = Column(UUID, ForeignKey("rfqs.id"), nullable=False)
    vendor_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(QuoteStatus), default=QuoteStatus.PENDING)

    # Quote details
    line_items = Column(JSON, nullable=True)  # Detailed line items with prices
    subtotal = Column(Float, nullable=True)
    tax_amount = Column(Float, nullable=True)
    total_amount = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    delivery_notes = Column(Text, nullable=True)

    # Warranty
    warranty_info = Column(String(500), nullable=True)
    warranty_months = Column(Integer, nullable=True)
    warranty_terms = Column(String(500), nullable=True)

    valid_until = Column(DateTime, nullable=True)
    vendor_notes = Column(Text, nullable=True)

    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rfq = relationship("RFQ", back_populates="quotes", foreign_keys=[rfq_id])
    vendor = relationship("User")
