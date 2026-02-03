"""
Job Card Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

from app.models.job_card import JobStatus, ServiceType, ServiceCategory, DeliveryType


# Booking request
class BookingRequest(BaseModel):
    vehicle_id: UUID
    branch_id: UUID
    service_type: ServiceType
    intake_type: DeliveryType = DeliveryType.DROP_OFF
    pickup_address: Optional[str] = None
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    preferred_pickup_time: Optional[datetime] = None
    scheduled_date: Optional[datetime] = None
    customer_notes: Optional[str] = None
    customer_media_urls: Optional[List[str]] = []


class JobCardCreate(BookingRequest):
    customer_id: UUID


class JobCardUpdate(BaseModel):
    service_type: Optional[ServiceType] = None
    service_category: Optional[ServiceCategory] = None
    status: Optional[JobStatus] = None
    service_advisor_id: Optional[UUID] = None
    technician_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    scheduled_date: Optional[datetime] = None
    estimated_completion_days: Optional[int] = None
    estimated_completion_date: Optional[datetime] = None
    delivery_type: Optional[DeliveryType] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    preferred_delivery_time: Optional[datetime] = None


# Estimate
class EstimateItemCreate(BaseModel):
    item_type: str  # labour, part, fee
    description: str
    part_number: Optional[str] = None
    quantity: float = 1
    unit: Optional[str] = None
    unit_price: float
    warranty_months: Optional[int] = None


class EstimateCreate(BaseModel):
    items: List[EstimateItemCreate]
    pickup_delivery_fee: float = 0
    tax_rate: float = 5  # VAT percentage
    notes: Optional[str] = None


class EstimateItemResponse(BaseModel):
    id: UUID
    item_type: str
    description: str
    part_number: Optional[str] = None
    quantity: float
    unit: Optional[str] = None
    unit_price: float
    total_price: float
    warranty_months: Optional[int] = None
    is_approved: bool
    
    class Config:
        from_attributes = True


# Responses
class JobCardBrief(BaseModel):
    id: UUID
    job_number: str
    status: JobStatus
    service_type: ServiceType
    vehicle_plate: Optional[str] = None
    vehicle_name: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: datetime
    scheduled_date: Optional[datetime] = None
    grand_total: float = 0


# Job Progress Update (Staff)
class JobUpdateCreate(BaseModel):
    title: str
    message: str
    media_urls: Optional[List[str]] = []
    is_visible_to_customer: bool = True


class JobUpdateResponse(BaseModel):
    id: UUID
    title: str
    message: str
    media_urls: List[str]
    created_at: datetime
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class JobCardResponse(BaseModel):
    id: UUID
    job_number: str
    customer_id: UUID
    vehicle_id: UUID
    branch_id: UUID
    service_type: ServiceType
    service_category: Optional[ServiceCategory] = None
    status: JobStatus
    intake_type: DeliveryType
    
    # Customer details
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    
    # Vehicle details
    vehicle_plate: Optional[str] = None
    vehicle_name: Optional[str] = None
    
    # Branch
    branch_name: Optional[str] = None
    
    # Staff
    service_advisor_id: Optional[UUID] = None
    technician_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    
    # Timing
    scheduled_date: Optional[datetime] = None
    estimated_completion_days: Optional[int] = None
    estimated_completion_date: Optional[datetime] = None
    
    # Pickup
    pickup_address: Optional[str] = None
    preferred_pickup_time: Optional[datetime] = None
    actual_pickup_time: Optional[datetime] = None
    
    # Delivery
    delivery_type: Optional[DeliveryType] = None
    delivery_address: Optional[str] = None
    preferred_delivery_time: Optional[datetime] = None
    actual_delivery_time: Optional[datetime] = None
    
    # Financials
    estimate_total: float = 0
    parts_total: float = 0
    labour_total: float = 0
    pickup_delivery_fee: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    grand_total: float = 0
    amount_paid: float = 0
    balance_due: float = 0
    
    # Approvals
    estimate_approved_at: Optional[datetime] = None
    parts_approved_at: Optional[datetime] = None
    
    # Notes
    customer_notes: Optional[str] = None
    customer_media_urls: List[str] = []
    
    # Completion
    customer_rating: Optional[int] = None
    customer_feedback: Optional[str] = None
    
    # Timeline
    updates: List['JobUpdateResponse'] = []
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class JobCardListResponse(BaseModel):
    jobs: List[JobCardBrief]
    total: int
    page: int
    page_size: int


# Status update
class StatusUpdate(BaseModel):
    status: JobStatus
    notes: Optional[str] = None


# Approval
class ApprovalRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


# Delivery confirmation
class DeliveryConfirmation(BaseModel):
    delivery_type: DeliveryType
    delivery_address: Optional[str] = None
    preferred_delivery_time: Optional[datetime] = None
    delivery_otp: Optional[str] = None


# Feedback
class FeedbackSubmit(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None


