"""
Job Card Service
"""
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.models import (
    JobCard, JobStatus, ServiceType, ServiceCategory, DeliveryType,
    User, UserRole, Vehicle, Branch,
    VehicleIntake, Diagnosis, EstimateItem,
    JobUpdate, AuditLog
)
from app.schemas.job_card import (
    BookingRequest, JobCardCreate, JobCardUpdate,
    EstimateCreate, EstimateItemCreate,
    JobCardResponse, JobCardBrief, JobCardListResponse,
    StatusUpdate, ApprovalRequest
)
from app.services.notification_service import NotificationService


class JobCardService:
    """Service for job card management"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def _generate_job_number(self) -> str:
        """Generate unique job number"""
        today = datetime.now().strftime("%Y%m%d")
        count = self.db.query(JobCard).filter(
            JobCard.job_number.like(f"JC{today}%")
        ).count()
        return f"JC{today}{count + 1:04d}"
    
    def create_booking(self, customer_id: UUID, data: BookingRequest) -> JobCard:
        """Create a new job card from booking request"""
        # Validate vehicle belongs to customer
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.id == data.vehicle_id,
            Vehicle.owner_id == customer_id
        ).first()
        
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found or doesn't belong to you"
            )
        
        # Validate branch
        branch = self.db.query(Branch).filter(
            Branch.id == data.branch_id,
            Branch.is_active == True
        ).first()
        
        if not branch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Branch not found or inactive"
            )
        
        # Create job card
        job_card = JobCard(
            job_number=self._generate_job_number(),
            customer_id=customer_id,
            vehicle_id=data.vehicle_id,
            branch_id=data.branch_id,
            service_type=data.service_type,
            intake_type=data.intake_type,
            status=JobStatus.REQUESTED,
            pickup_address=data.pickup_address,
            pickup_latitude=data.pickup_latitude,
            pickup_longitude=data.pickup_longitude,
            preferred_pickup_time=data.preferred_pickup_time,
            scheduled_date=data.scheduled_date,
            customer_notes=data.customer_notes,
            customer_media_urls=data.customer_media_urls or []
        )
        
        self.db.add(job_card)
        self.db.commit()
        self.db.refresh(job_card)
        
        # Log
        self._log_action(job_card.id, customer_id, "created", "Job card created")
        
        # Notify branch staff
        self.notification_service.notify_new_job(job_card)
        
        return job_card
    
    def get_job_card(self, job_id: UUID, user: User) -> JobCard:
        """Get job card by ID with access control"""
        job = self.db.query(JobCard).options(
            joinedload(JobCard.customer),
            joinedload(JobCard.vehicle),
            joinedload(JobCard.branch),
            joinedload(JobCard.intake),
            joinedload(JobCard.diagnosis),
            joinedload(JobCard.estimate_items),
            joinedload(JobCard.updates)
        ).filter(JobCard.id == job_id).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job card not found"
            )
        
        # Access control
        if user.role == UserRole.CUSTOMER and job.customer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if user.role == UserRole.VENDOR:
            # Vendors can only see jobs where they have quotes
            has_quote = any(
                quote.vendor_id == user.id
                for rfq in job.rfqs
                for quote in rfq.quotes
            )
            if not has_quote:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        return job
    
    def list_jobs(
        self,
        user: User,
        status_filter: Optional[List[JobStatus]] = None,
        branch_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20
    ) -> JobCardListResponse:
        """List job cards based on user role"""
        query = self.db.query(JobCard).options(
            joinedload(JobCard.customer),
            joinedload(JobCard.vehicle),
            joinedload(JobCard.branch)
        )
        
        # Role-based filtering
        if user.role == UserRole.CUSTOMER:
            query = query.filter(JobCard.customer_id == user.id)
        elif user.role == UserRole.TECHNICIAN:
            query = query.filter(JobCard.technician_id == user.id)
        elif user.role == UserRole.DRIVER:
            query = query.filter(JobCard.driver_id == user.id)
        elif user.role in [UserRole.SERVICE_ADVISOR, UserRole.ADMIN]:
            if branch_id:
                query = query.filter(JobCard.branch_id == branch_id)
            elif user.branch_id:
                query = query.filter(JobCard.branch_id == user.branch_id)
        
        # Status filter
        if status_filter:
            query = query.filter(JobCard.status.in_(status_filter))
        
        # Exclude closed/cancelled for active lists
        if not status_filter:
            query = query.filter(
                JobCard.status.notin_([JobStatus.CLOSED, JobStatus.CANCELLED])
            )
        
        # Count total
        total = query.count()
        
        # Paginate
        offset = (page - 1) * page_size
        jobs = query.order_by(JobCard.created_at.desc()).offset(offset).limit(page_size).all()
        
        # Build response
        job_briefs = []
        for job in jobs:
            job_briefs.append(JobCardBrief(
                id=job.id,
                job_number=job.job_number,
                status=job.status,
                service_type=job.service_type,
                vehicle_plate=job.vehicle.plate_number if job.vehicle else None,
                vehicle_name=f"{job.vehicle.make} {job.vehicle.model}" if job.vehicle else None,
                customer_name=job.customer.full_name if job.customer else None,
                created_at=job.created_at,
                scheduled_date=job.scheduled_date,
                grand_total=job.grand_total
            ))
        
        return JobCardListResponse(
            jobs=job_briefs,
            total=total,
            page=page,
            page_size=page_size
        )
    
    def update_status(
        self,
        job_id: UUID,
        user: User,
        new_status: JobStatus,
        notes: Optional[str] = None
    ) -> JobCard:
        """Update job card status with validation"""
        job = self.get_job_card(job_id, user)
        old_status = job.status
        
        # Validate status transition
        valid_transitions = self._get_valid_transitions(old_status)
        if new_status not in valid_transitions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status.value} to {new_status.value}"
            )
        
        # Update status
        job.status = new_status
        job.updated_at = datetime.utcnow()
        
        # Handle specific status updates
        if new_status == JobStatus.VEHICLE_PICKED:
            job.actual_pickup_time = datetime.utcnow()
        elif new_status == JobStatus.DELIVERED:
            job.actual_delivery_time = datetime.utcnow()
        elif new_status == JobStatus.CLOSED:
            job.actual_completion_date = datetime.utcnow()
        
        self.db.commit()
        
        # Create update record
        self._create_update(job, user, f"Status changed to {new_status.value}", notes, old_status.value, new_status.value)
        
        # Log
        self._log_action(job_id, user.id, "status_update", f"Status changed from {old_status.value} to {new_status.value}")
        
        # Notify customer
        self.notification_service.notify_status_change(job, old_status, new_status)
        
        return job
    
    def _get_valid_transitions(self, current: JobStatus) -> List[JobStatus]:
        """Get valid status transitions"""
        transitions = {
            JobStatus.REQUESTED: [JobStatus.SCHEDULED, JobStatus.CANCELLED],
            JobStatus.SCHEDULED: [JobStatus.VEHICLE_PICKED, JobStatus.IN_INTAKE, JobStatus.CANCELLED],
            JobStatus.VEHICLE_PICKED: [JobStatus.IN_INTAKE, JobStatus.CANCELLED],
            JobStatus.IN_INTAKE: [JobStatus.DIAGNOSED, JobStatus.CANCELLED],
            JobStatus.DIAGNOSED: [JobStatus.AWAITING_ESTIMATE_APPROVAL, JobStatus.CANCELLED],
            JobStatus.AWAITING_ESTIMATE_APPROVAL: [JobStatus.ESTIMATE_APPROVED, JobStatus.CANCELLED],
            JobStatus.ESTIMATE_APPROVED: [JobStatus.RFQ_SENT, JobStatus.AWAITING_PAYMENT, JobStatus.IN_SERVICE],
            JobStatus.RFQ_SENT: [JobStatus.QUOTES_RECEIVED, JobStatus.CANCELLED],
            JobStatus.QUOTES_RECEIVED: [JobStatus.AWAITING_PARTS_APPROVAL],
            JobStatus.AWAITING_PARTS_APPROVAL: [JobStatus.PARTS_APPROVED, JobStatus.CANCELLED],
            JobStatus.PARTS_APPROVED: [JobStatus.AWAITING_PAYMENT],
            JobStatus.AWAITING_PAYMENT: [JobStatus.PARTIALLY_PAID, JobStatus.PAID, JobStatus.CANCELLED],
            JobStatus.PARTIALLY_PAID: [JobStatus.PAID, JobStatus.PARTS_ORDERED, JobStatus.IN_SERVICE],
            JobStatus.PAID: [JobStatus.PARTS_ORDERED, JobStatus.IN_SERVICE],
            JobStatus.PARTS_ORDERED: [JobStatus.PARTS_RECEIVED],
            JobStatus.PARTS_RECEIVED: [JobStatus.IN_SERVICE],
            JobStatus.IN_SERVICE: [JobStatus.TESTING],
            JobStatus.TESTING: [JobStatus.READY, JobStatus.IN_SERVICE],
            JobStatus.READY: [JobStatus.OUT_FOR_DELIVERY, JobStatus.DELIVERED],
            JobStatus.OUT_FOR_DELIVERY: [JobStatus.DELIVERED],
            JobStatus.DELIVERED: [JobStatus.CLOSED],
            JobStatus.CLOSED: [],
            JobStatus.CANCELLED: []
        }
        return transitions.get(current, [])
    
    def create_estimate(
        self,
        job_id: UUID,
        user: User,
        data: EstimateCreate
    ) -> JobCard:
        """Create/update estimate for job card"""
        job = self.get_job_card(job_id, user)
        
        # Clear existing items
        self.db.query(EstimateItem).filter(EstimateItem.job_card_id == job_id).delete()
        
        labour_total = 0
        parts_total = 0
        
        # Add new items
        for item_data in data.items:
            total_price = item_data.quantity * item_data.unit_price
            
            item = EstimateItem(
                job_card_id=job_id,
                item_type=item_data.item_type,
                description=item_data.description,
                part_number=item_data.part_number,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                total_price=total_price,
                warranty_months=item_data.warranty_months
            )
            self.db.add(item)
            
            if item_data.item_type == "labour":
                labour_total += total_price
            elif item_data.item_type == "part":
                parts_total += total_price
        
        # Calculate totals
        job.labour_total = labour_total
        job.parts_total = parts_total
        job.pickup_delivery_fee = data.pickup_delivery_fee
        
        subtotal = labour_total + parts_total + data.pickup_delivery_fee
        job.tax_amount = subtotal * (data.tax_rate / 100)
        job.estimate_total = subtotal + job.tax_amount
        job.grand_total = job.estimate_total - job.discount_amount
        job.balance_due = job.grand_total - job.amount_paid
        
        # Update status
        if job.status == JobStatus.DIAGNOSED:
            job.status = JobStatus.AWAITING_ESTIMATE_APPROVAL
        
        self.db.commit()
        
        # Notify customer
        self.notification_service.notify_estimate_ready(job)
        
        return job
    
    def approve_estimate(self, job_id: UUID, user: User, approved: bool) -> JobCard:
        """Customer approval of estimate"""
        job = self.get_job_card(job_id, user)
        
        if job.status != JobStatus.AWAITING_ESTIMATE_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job is not awaiting estimate approval"
            )
        
        if not approved:
            job.status = JobStatus.CANCELLED
        else:
            job.estimate_approved_at = datetime.utcnow()
            # Check if parts needed
            has_parts = any(item.item_type == "part" for item in job.estimate_items)
            if has_parts:
                job.status = JobStatus.ESTIMATE_APPROVED  # Will need RFQ
            else:
                job.status = JobStatus.AWAITING_PAYMENT
        
        self.db.commit()
        
        self._log_action(job_id, user.id, "estimate_approval", f"Estimate {'approved' if approved else 'rejected'}")
        
        return job
    
    def approve_parts(self, job_id: UUID, user: User, approved: bool) -> JobCard:
        """Customer approval of parts quotes"""
        job = self.get_job_card(job_id, user)
        
        if job.status != JobStatus.AWAITING_PARTS_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job is not awaiting parts approval"
            )
        
        if not approved:
            job.status = JobStatus.CANCELLED
        else:
            job.parts_approved_at = datetime.utcnow()
            job.status = JobStatus.AWAITING_PAYMENT
        
        self.db.commit()
        
        self._log_action(job_id, user.id, "parts_approval", f"Parts {'approved' if approved else 'rejected'}")
        
        return job
    
    def add_update(
        self,
        job_id: UUID,
        user: User,
        title: str,
        message: str,
        media_urls: List[str] = [],
        is_visible: bool = True
    ) -> JobUpdate:
        """Add a progress update (with images) to a job card"""
        job = self.get_job_card(job_id, user)
        
        update = JobUpdate(
            job_card_id=job.id,
            created_by_id=user.id,
            title=title,
            message=message,
            media_urls=media_urls or [],
            is_visible_to_customer=is_visible
        )
        self.db.add(update)
        self.db.commit()
        self.db.refresh(update)
        
        # Log action
        self._log_action(job_id, user.id, "job_update", f"Update added: {title}")
        
        # Notify customer if visible
        if is_visible:
            self.notification_service.notify_job_update(job, title, message)
            
        return update
    
    def submit_feedback(
        self,
        job_id: UUID,
        user: User,
        rating: int,
        feedback: Optional[str]
    ) -> JobCard:
        """Submit customer feedback"""
        job = self.get_job_card(job_id, user)
        
        if job.status not in [JobStatus.DELIVERED, JobStatus.CLOSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only submit feedback after delivery"
            )
        
        job.customer_rating = rating
        job.customer_feedback = feedback
        job.feedback_submitted_at = datetime.utcnow()
        
        if job.status == JobStatus.DELIVERED:
            job.status = JobStatus.CLOSED
        
        self.db.commit()
        
        return job
    
    def _create_update(
        self,
        job: JobCard,
        user: User,
        title: str,
        message: Optional[str],
        old_status: Optional[str] = None,
        new_status: Optional[str] = None
    ):
        """Create job update record"""
        update = JobUpdate(
            job_card_id=job.id,
            created_by_id=user.id,
            title=title,
            message=message or title,
            previous_status=old_status,
            new_status=new_status
        )
        self.db.add(update)
        self.db.commit()
    
    def _log_action(
        self,
        job_id: UUID,
        user_id: UUID,
        action: str,
        description: str
    ):
        """Create audit log entry"""
        log = AuditLog(
            job_card_id=job_id,
            user_id=user_id,
            action=action,
            description=description
        )
        self.db.add(log)
        self.db.commit()
