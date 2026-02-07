"""
Job Card Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user, require_staff
from app.models import User, JobCard, JobStatus
from app.schemas.job_card import (
    BookingRequest, JobCardResponse, JobCardListResponse,
    EstimateCreate, EstimateItemResponse, StatusUpdate,
    ApprovalRequest, DeliveryConfirmation, FeedbackSubmit,
    JobUpdateCreate, JobUpdateResponse
)
from app.services.job_card_service import JobCardService

router = APIRouter(prefix="/jobs", tags=["Job Cards"])


@router.post("", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new service booking"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.create_booking(current_user.id, data)
    return _build_job_response(job)


@router.get("", response_model=JobCardListResponse)
async def list_jobs(
    status_filter: Optional[str] = Query(None, description="Comma-separated statuses"),
    branch_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List job cards based on user role"""
    service = JobCardService(db, org_id=current_user.organization_id)
    statuses = None
    if status_filter:
        statuses = [JobStatus(s.strip()) for s in status_filter.split(",")]
    return service.list_jobs(current_user, statuses, branch_id, page, page_size)


@router.get("/{job_id}", response_model=JobCardResponse)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get job card details"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.get_job_card(job_id, current_user)
    return _build_job_response(job)


@router.post("/{job_id}/status")
async def update_status(
    job_id: UUID,
    data: StatusUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Update job status (Staff only)"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.update_status(job_id, current_user, data.status, data.notes)
    return {"message": "Status updated", "status": job.status.value}


@router.post("/{job_id}/updates", response_model=JobUpdateResponse)
async def add_job_update(
    job_id: UUID,
    data: JobUpdateCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Add a progress update with images (Staff only)"""
    service = JobCardService(db, org_id=current_user.organization_id)
    update = service.add_update(
        job_id, current_user, data.title, data.message, 
        data.media_urls, data.is_visible_to_customer
    )
    return JobUpdateResponse(
        id=update.id,
        title=update.title,
        message=update.message,
        media_urls=update.media_urls or [],
        created_at=update.created_at,
        created_by_name=current_user.full_name
    )


@router.post("/{job_id}/estimate", response_model=JobCardResponse)
async def create_estimate(
    job_id: UUID,
    data: EstimateCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Create/update job estimate (Staff only)"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.create_estimate(job_id, current_user, data)
    return _build_job_response(job)


@router.post("/{job_id}/approve-estimate")
async def approve_estimate(
    job_id: UUID,
    data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject estimate (Customer)"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.approve_estimate(job_id, current_user, data.approved)
    return {"message": "Estimate " + ("approved" if data.approved else "rejected"), "status": job.status.value}


@router.post("/{job_id}/approve-parts")
async def approve_parts(
    job_id: UUID,
    data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject parts quote (Customer)"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.approve_parts(job_id, current_user, data.approved)
    return {"message": "Parts " + ("approved" if data.approved else "rejected"), "status": job.status.value}


@router.post("/{job_id}/feedback")
async def submit_feedback(
    job_id: UUID,
    data: FeedbackSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit customer feedback"""
    service = JobCardService(db, org_id=current_user.organization_id)
    job = service.submit_feedback(job_id, current_user, data.rating, data.feedback)
    return {"message": "Feedback submitted", "rating": job.customer_rating}


def _build_job_response(job: JobCard) -> JobCardResponse:
    """Build job card response with related data"""
    return JobCardResponse(
        id=job.id,
        job_number=job.job_number,
        customer_id=job.customer_id,
        vehicle_id=job.vehicle_id,
        branch_id=job.branch_id,
        service_type=job.service_type,
        service_category=job.service_category,
        status=job.status,
        intake_type=job.intake_type,
        customer_name=job.customer.full_name if job.customer else None,
        customer_mobile=job.customer.mobile if job.customer else None,
        vehicle_plate=job.vehicle.plate_number if job.vehicle else None,
        vehicle_name=f"{job.vehicle.make} {job.vehicle.model}" if job.vehicle else None,
        branch_name=job.branch.name if job.branch else None,
        service_advisor_id=job.service_advisor_id,
        technician_id=job.technician_id,
        driver_id=job.driver_id,
        scheduled_date=job.scheduled_date,
        estimated_completion_days=job.estimated_completion_days,
        estimated_completion_date=job.estimated_completion_date,
        pickup_address=job.pickup_address,
        preferred_pickup_time=job.preferred_pickup_time,
        actual_pickup_time=job.actual_pickup_time,
        delivery_type=job.delivery_type,
        delivery_address=job.delivery_address,
        preferred_delivery_time=job.preferred_delivery_time,
        actual_delivery_time=job.actual_delivery_time,
        estimate_total=job.estimate_total,
        parts_total=job.parts_total,
        labour_total=job.labour_total,
        pickup_delivery_fee=job.pickup_delivery_fee,
        tax_amount=job.tax_amount,
        discount_amount=job.discount_amount,
        grand_total=job.grand_total,
        amount_paid=job.amount_paid,
        balance_due=job.balance_due,
        estimate_approved_at=job.estimate_approved_at,
        parts_approved_at=job.parts_approved_at,
        customer_notes=job.customer_notes,
        customer_media_urls=job.customer_media_urls or [],
        customer_rating=job.customer_rating,
        customer_feedback=job.customer_feedback,
        updates=[
            JobUpdateResponse(
                id=u.id,
                title=u.title,
                message=u.message,
                media_urls=u.media_urls or [],
                created_at=u.created_at,
                created_by_name=u.created_by.full_name if u.created_by else None
            ) for u in job.updates if u.is_visible_to_customer
        ],
        created_at=job.created_at,
        updated_at=job.updated_at
    )
