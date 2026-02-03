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
    PENDING = "pending"
    SENT = "sent"
    QUOTES_RECEIVED = "quotes_received"
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
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    created_by_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    status = Column(Enum(RFQStatus), default=RFQStatus.PENDING)
    items = Column(JSON, nullable=False)  # List of parts needed with specs
    
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="rfqs")
    created_by = relationship("User")
    quotes = relationship("VendorQuote", back_populates="rfq", cascade="all, delete-orphan")


class VendorQuote(Base):
    """Quote submitted by a vendor for an RFQ"""
    __tablename__ = "vendor_quotes"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID, ForeignKey("rfqs.id"), nullable=False)
    vendor_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    status = Column(Enum(QuoteStatus), default=QuoteStatus.PENDING)
    
    # Quote details
    total_amount = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    warranty_info = Column(String(500), nullable=True)
    
    # Line items with their specific prices
    quote_data = Column(JSON, nullable=True)
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rfq = relationship("RFQ", back_populates="quotes")
    vendor = relationship("User")
