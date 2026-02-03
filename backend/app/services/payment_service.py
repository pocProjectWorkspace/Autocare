"""
Payment Service
"""
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    Payment, PaymentStatus, PaymentMethod, PaymentType,
    Invoice, JobCard, JobStatus, User
)
from app.schemas.payment import (
    PaymentCreate, PaymentLinkRequest, PaymentLinkResponse,
    PaymentResponse, PaymentListResponse,
    InvoiceCreate, InvoiceResponse
)
from app.services.notification_service import NotificationService
from app.core.config import settings
from app.core.security import generate_token


class PaymentService:
    """Service for payment management"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def _generate_payment_number(self) -> str:
        """Generate unique payment number"""
        today = datetime.now().strftime("%Y%m%d")
        count = self.db.query(Payment).filter(
            Payment.payment_number.like(f"PAY{today}%")
        ).count()
        return f"PAY{today}{count + 1:04d}"
    
    def _generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        today = datetime.now().strftime("%Y%m%d")
        count = self.db.query(Invoice).filter(
            Invoice.invoice_number.like(f"INV{today}%")
        ).count()
        return f"INV{today}{count + 1:04d}"
    
    def create_payment_link(
        self,
        job_id: UUID,
        user: User,
        data: PaymentLinkRequest
    ) -> PaymentLinkResponse:
        """Generate payment link for customer"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        # Determine payment type
        if job.amount_paid == 0:
            if data.amount < job.grand_total:
                payment_type = PaymentType.DEPOSIT
            else:
                payment_type = PaymentType.FULL
        else:
            payment_type = PaymentType.BALANCE
        
        # Create payment record
        payment = Payment(
            job_card_id=job_id,
            payment_number=self._generate_payment_number(),
            payment_type=payment_type,
            payment_method=PaymentMethod.PAYMENT_LINK,
            amount=data.amount,
            status=PaymentStatus.PENDING,
            payment_link_url=f"{settings.APP_URL}/pay/{generate_token(16)}",  # Mock URL
            payment_link_expires=datetime.utcnow() + timedelta(hours=24)
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        
        # Notify customer
        self.notification_service.notify_payment_request(job, payment)
        
        return PaymentLinkResponse(
            payment_id=payment.id,
            payment_link_url=payment.payment_link_url,
            expires_at=payment.payment_link_expires,
            amount=payment.amount
        )
    
    def record_cash_payment(
        self,
        job_id: UUID,
        user: User,
        data: PaymentCreate
    ) -> Payment:
        """Record cash or manual payment"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        # Create payment record
        payment = Payment(
            job_card_id=job_id,
            payment_number=self._generate_payment_number(),
            payment_type=data.payment_type,
            payment_method=data.payment_method,
            amount=data.amount,
            status=PaymentStatus.COMPLETED,
            collected_by_id=user.id,
            paid_at=datetime.utcnow(),
            notes=data.notes
        )
        self.db.add(payment)
        
        # Update job totals
        job.amount_paid += data.amount
        job.balance_due = job.grand_total - job.amount_paid
        
        # Update job status
        if job.balance_due <= 0:
            job.status = JobStatus.PAID
        elif job.status == JobStatus.AWAITING_PAYMENT:
            job.status = JobStatus.PARTIALLY_PAID
        
        self.db.commit()
        self.db.refresh(payment)
        
        # Notify customer
        self.notification_service.notify_payment_received(job, payment)
        
        return payment
    
    def confirm_online_payment(
        self,
        payment_id: UUID,
        gateway_response: dict
    ) -> Payment:
        """Confirm online payment from gateway callback"""
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        if payment.status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already processed"
            )
        
        # Update payment
        payment.status = PaymentStatus.COMPLETED
        payment.gateway_response = gateway_response
        payment.gateway_transaction_id = gateway_response.get("transaction_id")
        payment.paid_at = datetime.utcnow()
        
        # Update job totals
        job = payment.job_card
        job.amount_paid += payment.amount
        job.balance_due = job.grand_total - job.amount_paid
        
        # Update job status
        if job.balance_due <= 0:
            job.status = JobStatus.PAID
        elif job.status == JobStatus.AWAITING_PAYMENT:
            job.status = JobStatus.PARTIALLY_PAID
        
        self.db.commit()
        
        # Notify customer
        self.notification_service.notify_payment_received(job, payment)
        
        return payment
    
    def get_job_payments(self, job_id: UUID, user: User) -> PaymentListResponse:
        """Get all payments for a job"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        payments = self.db.query(Payment).filter(
            Payment.job_card_id == job_id
        ).order_by(Payment.created_at.desc()).all()
        
        total_paid = sum(p.amount for p in payments if p.status == PaymentStatus.COMPLETED)
        
        return PaymentListResponse(
            payments=[PaymentResponse.model_validate(p) for p in payments],
            total_amount=job.grand_total,
            total_paid=total_paid,
            balance=job.grand_total - total_paid
        )
    
    def create_invoice(
        self,
        job_id: UUID,
        user: User,
        data: InvoiceCreate
    ) -> Invoice:
        """Create invoice for job"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        # Calculate totals
        subtotal = sum(item.total for item in data.line_items)
        tax_amount = subtotal * (data.tax_rate / 100)
        total_amount = subtotal + tax_amount - data.discount_amount
        
        invoice = Invoice(
            job_card_id=job_id,
            invoice_number=self._generate_invoice_number(),
            invoice_type=data.invoice_type,
            subtotal=subtotal,
            tax_rate=data.tax_rate,
            tax_amount=tax_amount,
            discount_amount=data.discount_amount,
            total_amount=total_amount,
            line_items=[item.model_dump() for item in data.line_items],
            notes=data.notes,
            terms=data.terms,
            due_date=datetime.utcnow() + timedelta(days=7)
        )
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        
        return invoice
    
    def generate_final_invoice(self, job_id: UUID, user: User) -> Invoice:
        """Auto-generate final invoice from job card"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        # Build line items from estimate
        line_items = []
        for item in job.estimate_items:
            line_items.append({
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.total_price
            })
        
        # Add pickup/delivery fee if any
        if job.pickup_delivery_fee > 0:
            line_items.append({
                "description": "Pickup/Delivery Fee",
                "quantity": 1,
                "unit_price": job.pickup_delivery_fee,
                "total": job.pickup_delivery_fee
            })
        
        invoice = Invoice(
            job_card_id=job_id,
            invoice_number=self._generate_invoice_number(),
            invoice_type="final",
            subtotal=job.labour_total + job.parts_total + job.pickup_delivery_fee,
            tax_rate=5,
            tax_amount=job.tax_amount,
            discount_amount=job.discount_amount,
            total_amount=job.grand_total,
            line_items=line_items,
            is_paid=job.balance_due <= 0,
            due_date=datetime.utcnow() + timedelta(days=7)
        )
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        
        return invoice
