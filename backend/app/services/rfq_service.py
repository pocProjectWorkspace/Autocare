"""
RFQ Service for vendor quotations
"""
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models import (
    RFQ, RFQStatus, VendorQuote, QuoteStatus,
    JobCard, JobStatus, EstimateItem,
    User, UserRole
)
from app.schemas.rfq import (
    RFQCreate, RFQResponse, RFQWithQuotes,
    QuoteSubmit, QuoteResponse, QuoteSelection
)
from app.services.notification_service import NotificationService
from app.core.config import settings


class RFQService:
    """Service for RFQ and vendor quote management"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def _generate_rfq_number(self) -> str:
        """Generate unique RFQ number"""
        today = datetime.now().strftime("%Y%m%d")
        count = self.db.query(RFQ).filter(
            RFQ.rfq_number.like(f"RFQ{today}%")
        ).count()
        return f"RFQ{today}{count + 1:04d}"
    
    def create_rfq(
        self,
        job_id: UUID,
        user: User,
        data: RFQCreate
    ) -> RFQ:
        """Create RFQ for parts"""
        job = self.db.query(JobCard).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        if job.status not in [JobStatus.ESTIMATE_APPROVED, JobStatus.RFQ_SENT]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job is not ready for RFQ"
            )
        
        # Create RFQ
        rfq = RFQ(
            job_card_id=job_id,
            rfq_number=self._generate_rfq_number(),
            parts_list=[p.model_dump() for p in data.parts_list],
            status=RFQStatus.DRAFT,
            quote_deadline=data.quote_deadline or (datetime.utcnow() + timedelta(days=2)),
            selection_rule=data.selection_rule,
            max_delivery_days=data.max_delivery_days
        )
        self.db.add(rfq)
        self.db.commit()
        self.db.refresh(rfq)
        
        return rfq
    
    def send_rfq(
        self,
        rfq_id: UUID,
        user: User,
        vendor_ids: Optional[List[UUID]] = None
    ) -> RFQ:
        """Send RFQ to vendors"""
        rfq = self.db.query(RFQ).filter(RFQ.id == rfq_id).first()
        
        if not rfq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RFQ not found"
            )
        
        if rfq.status != RFQStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RFQ already sent"
            )
        
        # Get vendors
        if vendor_ids:
            vendors = self.db.query(User).filter(
                User.id.in_(vendor_ids),
                User.role == UserRole.VENDOR,
                User.is_active == True
            ).all()
        else:
            # Get all active vendors
            vendors = self.db.query(User).filter(
                User.role == UserRole.VENDOR,
                User.is_active == True
            ).limit(settings.MAX_RFQ_VENDORS).all()
        
        if not vendors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No vendors available"
            )
        
        # Create quote placeholders for each vendor
        for vendor in vendors:
            quote = VendorQuote(
                rfq_id=rfq.id,
                vendor_id=vendor.id,
                status=QuoteStatus.PENDING
            )
            self.db.add(quote)
        
        # Update RFQ status
        rfq.status = RFQStatus.SENT
        rfq.sent_at = datetime.utcnow()
        
        # Update job status
        job = rfq.job_card
        if job.status == JobStatus.ESTIMATE_APPROVED:
            job.status = JobStatus.RFQ_SENT
        
        self.db.commit()
        
        # Notify vendors
        for vendor in vendors:
            self.notification_service.notify_vendor_rfq(vendor, rfq)
        
        return rfq
    
    def get_rfq(self, rfq_id: UUID, user: User) -> RFQWithQuotes:
        """Get RFQ with quotes"""
        rfq = self.db.query(RFQ).options(
            joinedload(RFQ.quotes).joinedload(VendorQuote.vendor),
            joinedload(RFQ.job_card)
        ).filter(RFQ.id == rfq_id).first()
        
        if not rfq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RFQ not found"
            )
        
        # Build response with vendor names
        quotes = []
        for quote in rfq.quotes:
            quote_data = QuoteResponse.model_validate(quote)
            quote_data.vendor_name = quote.vendor.full_name if quote.vendor else None
            quotes.append(quote_data)
        
        response = RFQWithQuotes.model_validate(rfq)
        response.quotes = quotes
        
        return response
    
    def submit_quote(
        self,
        rfq_id: UUID,
        vendor: User,
        data: QuoteSubmit
    ) -> VendorQuote:
        """Vendor submits quote"""
        # Get the quote placeholder
        quote = self.db.query(VendorQuote).filter(
            VendorQuote.rfq_id == rfq_id,
            VendorQuote.vendor_id == vendor.id
        ).first()
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found or not invited"
            )
        
        if quote.status not in [QuoteStatus.PENDING, QuoteStatus.SUBMITTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify this quote"
            )
        
        # Calculate totals
        subtotal = sum(item.total for item in data.line_items)
        tax_amount = subtotal * 0.05  # 5% VAT
        
        # Update quote
        quote.quote_number = data.quote_number
        quote.line_items = [item.model_dump() for item in data.line_items]
        quote.subtotal = subtotal
        quote.tax_amount = tax_amount
        quote.total_amount = subtotal + tax_amount
        quote.delivery_days = data.delivery_days
        quote.delivery_notes = data.delivery_notes
        quote.warranty_months = data.warranty_months
        quote.warranty_terms = data.warranty_terms
        quote.valid_until = data.valid_until
        quote.vendor_notes = data.vendor_notes
        quote.status = QuoteStatus.SUBMITTED
        quote.submitted_at = datetime.utcnow()
        
        # Check if all quotes received
        rfq = quote.rfq
        all_submitted = all(q.status != QuoteStatus.PENDING for q in rfq.quotes)
        if all_submitted:
            rfq.status = RFQStatus.QUOTES_RECEIVED
            
            # Update job status
            job = rfq.job_card
            if job.status == JobStatus.RFQ_SENT:
                job.status = JobStatus.QUOTES_RECEIVED
        
        self.db.commit()
        
        return quote
    
    def select_quote(
        self,
        rfq_id: UUID,
        user: User,
        data: QuoteSelection
    ) -> RFQ:
        """Select winning quote"""
        rfq = self.db.query(RFQ).options(
            joinedload(RFQ.quotes),
            joinedload(RFQ.job_card)
        ).filter(RFQ.id == rfq_id).first()
        
        if not rfq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RFQ not found"
            )
        
        if rfq.status not in [RFQStatus.QUOTES_RECEIVED, RFQStatus.SENT]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RFQ not ready for selection"
            )
        
        # Find selected quote
        selected = next(
            (q for q in rfq.quotes if q.id == data.quote_id and q.status == QuoteStatus.SUBMITTED),
            None
        )
        
        if not selected:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found or not submitted"
            )
        
        # Update quote statuses
        for quote in rfq.quotes:
            if quote.id == data.quote_id:
                quote.status = QuoteStatus.SELECTED
            elif quote.status == QuoteStatus.SUBMITTED:
                quote.status = QuoteStatus.REJECTED
        
        # Update RFQ
        rfq.selected_quote_id = data.quote_id
        rfq.selection_reason = data.selection_reason
        rfq.selected_at = datetime.utcnow()
        rfq.selected_by_id = user.id
        rfq.status = RFQStatus.QUOTE_SELECTED
        
        # Update job totals with selected quote
        job = rfq.job_card
        job.parts_total = selected.total_amount
        job.grand_total = job.labour_total + job.parts_total + job.pickup_delivery_fee + job.tax_amount - job.discount_amount
        job.balance_due = job.grand_total - job.amount_paid
        job.status = JobStatus.AWAITING_PARTS_APPROVAL
        
        self.db.commit()
        
        # Notify customer
        self.notification_service.notify_parts_quote_ready(job)
        
        return rfq
    
    def auto_select_quote(self, rfq_id: UUID) -> Optional[VendorQuote]:
        """Auto-select best quote based on rules"""
        rfq = self.db.query(RFQ).options(
            joinedload(RFQ.quotes).joinedload(VendorQuote.vendor)
        ).filter(RFQ.id == rfq_id).first()
        
        if not rfq or rfq.status != RFQStatus.QUOTES_RECEIVED:
            return None
        
        # Filter valid quotes
        valid_quotes = [
            q for q in rfq.quotes
            if q.status == QuoteStatus.SUBMITTED
            and q.delivery_days <= rfq.max_delivery_days
        ]
        
        if not valid_quotes:
            return None
        
        # Apply selection rule
        if rfq.selection_rule == "cheapest_available":
            # Sort by price, then delivery time
            valid_quotes.sort(key=lambda q: (q.total_amount, q.delivery_days))
        elif rfq.selection_rule == "fastest":
            # Sort by delivery time, then price
            valid_quotes.sort(key=lambda q: (q.delivery_days, q.total_amount))
        elif rfq.selection_rule == "best_rated":
            # Sort by vendor rating, then price
            valid_quotes.sort(key=lambda q: (-(float(q.vendor.vendor_rating or 0)), q.total_amount))
        
        return valid_quotes[0] if valid_quotes else None
    
    def get_vendor_rfqs(
        self,
        vendor: User,
        status_filter: Optional[List[RFQStatus]] = None,
        page: int = 1,
        page_size: int = 20
    ) -> List[RFQ]:
        """Get RFQs for a vendor"""
        query = self.db.query(RFQ).join(VendorQuote).filter(
            VendorQuote.vendor_id == vendor.id
        ).options(
            joinedload(RFQ.job_card).joinedload(JobCard.vehicle)
        )
        
        if status_filter:
            query = query.filter(RFQ.status.in_(status_filter))
        
        offset = (page - 1) * page_size
        return query.order_by(RFQ.created_at.desc()).offset(offset).limit(page_size).all()
