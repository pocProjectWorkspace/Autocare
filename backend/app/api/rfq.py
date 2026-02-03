"""
RFQ and Vendor Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user, require_staff, require_vendor
from app.models import User, RFQStatus
from app.schemas.rfq import RFQCreate, RFQResponse, RFQWithQuotes, QuoteSubmit, QuoteResponse, QuoteSelection
from app.services.rfq_service import RFQService

router = APIRouter(prefix="/rfq", tags=["RFQ & Quotes"])


@router.post("/{job_id}", response_model=RFQResponse, status_code=201)
async def create_rfq(
    job_id: UUID,
    data: RFQCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Create RFQ for job parts (Staff only)"""
    service = RFQService(db)
    return service.create_rfq(job_id, current_user, data)


@router.post("/{rfq_id}/send", response_model=RFQResponse)
async def send_rfq(
    rfq_id: UUID,
    vendor_ids: Optional[List[UUID]] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Send RFQ to vendors (Staff only)"""
    service = RFQService(db)
    return service.send_rfq(rfq_id, current_user, vendor_ids)


@router.get("/{rfq_id}", response_model=RFQWithQuotes)
async def get_rfq(
    rfq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get RFQ with quotes"""
    service = RFQService(db)
    return service.get_rfq(rfq_id, current_user)


@router.post("/{rfq_id}/select", response_model=RFQResponse)
async def select_quote(
    rfq_id: UUID,
    data: QuoteSelection,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Select winning quote (Staff only)"""
    service = RFQService(db)
    return service.select_quote(rfq_id, current_user, data)


# Vendor endpoints
vendor_router = APIRouter(prefix="/vendor", tags=["Vendor"])


@vendor_router.get("/rfqs")
async def list_vendor_rfqs(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """List RFQs for vendor"""
    service = RFQService(db)
    statuses = None
    if status_filter:
        statuses = [RFQStatus(s.strip()) for s in status_filter.split(",")]
    rfqs = service.get_vendor_rfqs(current_user, statuses, page, page_size)
    return {"rfqs": rfqs, "total": len(rfqs)}


@vendor_router.post("/rfqs/{rfq_id}/quote", response_model=QuoteResponse)
async def submit_quote(
    rfq_id: UUID,
    data: QuoteSubmit,
    current_user: User = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    """Submit quote for RFQ"""
    service = RFQService(db)
    return service.submit_quote(rfq_id, current_user, data)
