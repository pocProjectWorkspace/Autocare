"""
Driver API Routes - Pickup & Delivery Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user, require_role
from app.models import User, JobCard, JobStatus, Payment, PaymentStatus, PaymentMethod
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Driver"])


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    heading: Optional[float] = None


@router.get("/pickups")
async def get_driver_pickups(
    date_filter: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver", "admin"]))
):
    """Get assigned pickups for driver"""
    query = db.query(JobCard).filter(
        JobCard.intake_type == 'pickup',
        JobCard.status.in_([JobStatus.SCHEDULED, JobStatus.EN_ROUTE_PICKUP, JobStatus.VEHICLE_PICKED]),
        or_(
            JobCard.pickup_driver_id == current_user.id,
            JobCard.pickup_driver_id.is_(None)  # Unassigned
        )
    )
    
    if date_filter:
        query = query.filter(
            func.date(JobCard.scheduled_date) == date_filter
        )
    
    jobs = query.order_by(JobCard.scheduled_date).all()
    
    return {
        "pickups": [{
            "id": str(j.id),
            "job_number": j.job_number,
            "customer_name": j.customer.full_name if j.customer else None,
            "customer_mobile": j.customer.mobile if j.customer else None,
            "vehicle_plate": j.vehicle.plate_number if j.vehicle else None,
            "vehicle_name": f"{j.vehicle.make} {j.vehicle.model}" if j.vehicle else None,
            "pickup_address": j.pickup_address,
            "scheduled_time": j.scheduled_date.isoformat() if j.scheduled_date else None,
            "status": j.status,
            "branch_name": j.branch.name if j.branch else None,
        } for j in jobs]
    }


@router.get("/deliveries")
async def get_driver_deliveries(
    date_filter: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver", "admin"]))
):
    """Get assigned deliveries for driver"""
    query = db.query(JobCard).filter(
        JobCard.status.in_([JobStatus.READY, JobStatus.OUT_FOR_DELIVERY]),
        or_(
            JobCard.delivery_driver_id == current_user.id,
            JobCard.delivery_driver_id.is_(None)
        )
    )
    
    if date_filter:
        query = query.filter(
            func.date(JobCard.preferred_delivery_time) == date_filter
        )
    
    jobs = query.order_by(JobCard.updated_at.desc()).all()
    
    return {
        "deliveries": [{
            "id": str(j.id),
            "job_number": j.job_number,
            "customer_name": j.customer.full_name if j.customer else None,
            "customer_mobile": j.customer.mobile if j.customer else None,
            "vehicle_plate": j.vehicle.plate_number if j.vehicle else None,
            "vehicle_name": f"{j.vehicle.make} {j.vehicle.model}" if j.vehicle else None,
            "delivery_address": j.delivery_address or j.pickup_address,
            "delivery_time": j.preferred_delivery_time.isoformat() if j.preferred_delivery_time else None,
            "status": j.status,
            "balance_due": float(j.balance_due or 0),
            "branch_name": j.branch.name if j.branch else None,
        } for j in jobs]
    }


@router.post("/{job_id}/start-pickup")
async def start_pickup(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Driver starts heading to pickup location"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Invalid job status for pickup")

    job.status = JobStatus.EN_ROUTE_PICKUP
    job.pickup_driver_id = current_user.id
    job.updated_at = datetime.utcnow()
    db.commit()
    
    # Notify customer
    notification_svc = NotificationService(db, org_id=current_user.organization_id)
    notification_svc.notify_job_update(job, "Driver En Route",
        f"Your driver is on the way for pickup. Job: {job.job_number}")

    return {"message": "Pickup started", "status": job.status}


@router.post("/{job_id}/confirm-pickup")
async def confirm_pickup(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Driver confirms vehicle picked up"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [JobStatus.SCHEDULED, JobStatus.EN_ROUTE_PICKUP]:
        raise HTTPException(status_code=400, detail="Invalid job status")

    job.status = JobStatus.VEHICLE_PICKED
    job.pickup_driver_id = current_user.id
    job.vehicle_picked_at = datetime.utcnow()
    job.updated_at = datetime.utcnow()
    db.commit()
    
    # Notify customer and branch
    notification_svc = NotificationService(db, org_id=current_user.organization_id)
    notification_svc.notify_job_update(job, "Vehicle Picked Up",
        f"Your vehicle has been picked up. Job: {job.job_number}")

    return {"message": "Pickup confirmed", "status": job.status}


@router.post("/{job_id}/start-delivery")
async def start_delivery(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Driver starts delivery"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.READY:
        raise HTTPException(status_code=400, detail="Job not ready for delivery")

    job.status = JobStatus.OUT_FOR_DELIVERY
    job.delivery_driver_id = current_user.id
    job.updated_at = datetime.utcnow()
    db.commit()
    
    # Notify customer
    notification_svc = NotificationService(db, org_id=current_user.organization_id)
    notification_svc.notify_job_update(job, "Vehicle Out for Delivery",
        f"Your vehicle is on its way! Job: {job.job_number}")

    return {"message": "Delivery started", "status": job.status}


@router.post("/{job_id}/confirm-delivery")
async def confirm_delivery(
    job_id: str,
    cash_collected: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Driver confirms delivery complete"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.OUT_FOR_DELIVERY:
        raise HTTPException(status_code=400, detail="Invalid job status")

    job.status = JobStatus.DELIVERED
    job.delivery_driver_id = current_user.id
    job.delivered_at = datetime.utcnow()
    job.updated_at = datetime.utcnow()
    
    # Record cash if collected
    if cash_collected and cash_collected > 0:
        payment = Payment(
            organization_id=current_user.organization_id,
            job_card_id=job.id,
            user_id=job.customer_id,
            amount=cash_collected,
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.COMPLETED,
            paid_at=datetime.utcnow(),
            collected_by_id=current_user.id,
            notes="Collected on delivery"
        )
        db.add(payment)
        job.amount_paid = (job.amount_paid or 0) + cash_collected
        job.balance_due = (job.grand_total or 0) - job.amount_paid
    
    db.commit()
    
    # Notify customer
    notification_svc = NotificationService(db, org_id=current_user.organization_id)
    notification_svc.notify_job_update(job, "Vehicle Delivered",
        f"Your vehicle has been delivered! Please rate your experience. Job: {job.job_number}")

    return {"message": "Delivery confirmed", "status": job.status}


@router.post("/{job_id}/location")
async def update_driver_location(
    job_id: str,
    location: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Update driver location for tracking"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Store location (could be Redis for real-time)
    job.driver_latitude = location.latitude
    job.driver_longitude = location.longitude
    job.location_updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Location updated"}


@router.get("/history")
async def get_driver_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["driver"]))
):
    """Get driver's completed pickups and deliveries"""
    query = db.query(JobCard).filter(
        or_(
            JobCard.pickup_driver_id == current_user.id,
            JobCard.delivery_driver_id == current_user.id
        ),
        JobCard.status.in_([JobStatus.VEHICLE_PICKED, JobStatus.DELIVERED, JobStatus.CLOSED])
    ).order_by(JobCard.updated_at.desc())
    
    total = query.count()
    jobs = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "jobs": [{
            "id": str(j.id),
            "job_number": j.job_number,
            "customer_name": j.customer.full_name if j.customer else None,
            "vehicle_plate": j.vehicle.plate_number if j.vehicle else None,
            "intake_type": j.intake_type,
            "status": j.status,
            "updated_at": j.updated_at.isoformat(),
        } for j in jobs],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size
    }
