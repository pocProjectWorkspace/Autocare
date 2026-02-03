"""
RFQ and Vendor Quote Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.models.rfq import RFQStatus, QuoteStatus


# RFQ Part
class RFQPart(BaseModel):
    part_number: Optional[str] = None
    description: str
    quantity: int = 1
    notes: Optional[str] = None


# RFQ Create
class RFQCreate(BaseModel):
    parts_list: List[RFQPart]
    quote_deadline: Optional[datetime] = None
    selection_rule: str = "cheapest_available"  # cheapest, fastest, best_rated
    max_delivery_days: int = 7
    vendor_ids: Optional[List[UUID]] = None  # Specific vendors to send to


class RFQResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    rfq_number: str
    parts_list: List[Dict[str, Any]]
    status: RFQStatus
    quote_deadline: Optional[datetime] = None
    selection_rule: str
    max_delivery_days: int
    selected_quote_id: Optional[UUID] = None
    selection_reason: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Quote Line Item
class QuoteLineItem(BaseModel):
    part_number: Optional[str] = None
    description: str
    quantity: int
    unit_price: float
    total: float
    warranty_months: int = 0
    availability: str = "in_stock"  # in_stock, order_required, out_of_stock
    notes: Optional[str] = None


# Quote Submit
class QuoteSubmit(BaseModel):
    quote_number: Optional[str] = None
    line_items: List[QuoteLineItem]
    delivery_days: int
    delivery_notes: Optional[str] = None
    warranty_months: int = 0
    warranty_terms: Optional[str] = None
    valid_until: Optional[datetime] = None
    vendor_notes: Optional[str] = None


class QuoteResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    vendor_id: UUID
    vendor_name: Optional[str] = None
    quote_number: Optional[str] = None
    status: QuoteStatus
    line_items: List[Dict[str, Any]]
    subtotal: float
    tax_amount: float
    total_amount: float
    delivery_days: Optional[int] = None
    delivery_notes: Optional[str] = None
    warranty_months: int
    warranty_terms: Optional[str] = None
    valid_until: Optional[datetime] = None
    vendor_notes: Optional[str] = None
    created_at: datetime
    submitted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RFQWithQuotes(RFQResponse):
    quotes: List[QuoteResponse] = []


# Quote Selection
class QuoteSelection(BaseModel):
    quote_id: UUID
    selection_reason: Optional[str] = None
