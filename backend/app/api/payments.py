"""
Payment Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user, require_staff
from app.models import User
from app.schemas.payment import (
    PaymentCreate, PaymentLinkRequest, PaymentLinkResponse,
    PaymentResponse, PaymentListResponse, InvoiceResponse
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/job/{job_id}", response_model=PaymentListResponse)
async def get_job_payments(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payments for a job"""
    service = PaymentService(db)
    return service.get_job_payments(job_id, current_user)


@router.post("/job/{job_id}/link", response_model=PaymentLinkResponse)
async def create_payment_link(
    job_id: UUID,
    data: PaymentLinkRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Generate payment link (Staff only)"""
    service = PaymentService(db)
    return service.create_payment_link(job_id, current_user, data)


@router.post("/job/{job_id}/cash", response_model=PaymentResponse)
async def record_cash_payment(
    job_id: UUID,
    data: PaymentCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Record cash/manual payment (Staff only)"""
    service = PaymentService(db)
    return service.record_cash_payment(job_id, current_user, data)


@router.post("/confirm/{payment_id}")
async def confirm_payment(
    payment_id: UUID,
    gateway_response: dict,
    db: Session = Depends(get_db)
):
    """Payment gateway callback"""
    service = PaymentService(db)
    payment = service.confirm_online_payment(payment_id, gateway_response)
    return {"status": "confirmed", "payment_id": str(payment.id)}


@router.post("/job/{job_id}/invoice", response_model=InvoiceResponse)
async def generate_invoice(
    job_id: UUID,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Generate final invoice (Staff only)"""
    service = PaymentService(db)
    return service.generate_final_invoice(job_id, current_user)
