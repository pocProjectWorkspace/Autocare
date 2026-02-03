"""
Payment Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.models.payment import PaymentStatus, PaymentMethod, PaymentType


# Payment creation
class PaymentCreate(BaseModel):
    payment_type: PaymentType
    payment_method: PaymentMethod
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class PaymentLinkRequest(BaseModel):
    amount: float = Field(..., gt=0)
    description: Optional[str] = None


class PaymentLinkResponse(BaseModel):
    payment_id: UUID
    payment_link_url: str
    expires_at: datetime
    amount: float


class PaymentResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    payment_number: str
    payment_type: PaymentType
    payment_method: PaymentMethod
    status: PaymentStatus
    amount: float
    currency: str
    reference_number: Optional[str] = None
    payment_link_url: Optional[str] = None
    collected_by_id: Optional[UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    total_amount: float
    total_paid: float
    balance: float


# Invoice
class InvoiceLineItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total: float


class InvoiceCreate(BaseModel):
    invoice_type: str = "final"  # estimate, proforma, final
    line_items: List[InvoiceLineItem]
    tax_rate: float = 5
    discount_amount: float = 0
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    invoice_number: str
    invoice_type: str
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    line_items: List[Dict[str, Any]]
    is_paid: bool
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    due_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True
