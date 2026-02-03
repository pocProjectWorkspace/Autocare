"""
Vendor API Routes - Quote Submission and Order Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user, require_role
from app.models import User, RFQ, VendorQuote
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Vendor"])


class QuoteItemCreate(BaseModel):
    part_number: str
    description: str
    quantity: int
    unit_price: float
    notes: Optional[str] = None


class QuoteCreate(BaseModel):
    items: List[QuoteItemCreate]
    delivery_days: int = 3
    validity_days: int = 7
    notes: Optional[str] = None
    total_amount: float


@router.get("/rfqs")
async def get_available_rfqs(
    status: Optional[str] = Query("sent"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Get RFQs available for vendor to quote"""
    query = db.query(RFQ)
    
    if status:
        query = query.filter(RFQ.status == status)
    
    # Only show RFQs not expired
    query = query.filter(
        or_(RFQ.quote_deadline >= datetime.utcnow(), RFQ.quote_deadline.is_(None))
    )
    
    total = query.count()
    rfqs = query.order_by(RFQ.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    result = []
    for rfq in rfqs:
        # Check if vendor already quoted
        my_quote = db.query(VendorQuote).filter(
            VendorQuote.rfq_id == rfq.id,
            VendorQuote.vendor_id == current_user.id
        ).first()
        
        result.append({
            "id": str(rfq.id),
            "rfq_number": rfq.rfq_number,
            "job_id": str(rfq.job_card_id),
            "job_number": rfq.job_card.job_number if rfq.job_card else None,
            "status": rfq.status.value if hasattr(rfq.status, 'value') else rfq.status,
            "parts": rfq.parts_list or [],
            "deadline": rfq.quote_deadline.isoformat() if rfq.quote_deadline else None,
            "quote_count": len(rfq.quotes),
            "created_at": rfq.created_at.isoformat(),
            "my_quote": {
                "id": str(my_quote.id),
                "total_amount": float(my_quote.total_amount),
                "status": my_quote.status.value if hasattr(my_quote.status, 'value') else my_quote.status
            } if my_quote else None
        })
    
    return {
        "rfqs": result,
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size
    }


@router.get("/rfqs/{rfq_id}")
async def get_rfq_detail(
    rfq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Get RFQ details"""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    my_quote = db.query(VendorQuote).filter(
        VendorQuote.rfq_id == rfq.id,
        VendorQuote.vendor_id == current_user.id
    ).first()
    
    return {
        "id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "job_id": str(rfq.job_card_id),
        "job_number": rfq.job_card.job_number if rfq.job_card else None,
        "status": rfq.status.value if hasattr(rfq.status, 'value') else rfq.status,
        "parts": rfq.parts_list or [],
        "deadline": rfq.quote_deadline.isoformat() if rfq.quote_deadline else None,
        "created_at": rfq.created_at.isoformat(),
        "my_quote": {
            "id": str(my_quote.id),
            "items": my_quote.line_items or [],
            "total_amount": float(my_quote.total_amount),
            "delivery_days": my_quote.delivery_days,
            "status": my_quote.status.value if hasattr(my_quote.status, 'value') else my_quote.status,
            "created_at": my_quote.created_at.isoformat()
        } if my_quote else None
    }


@router.post("/rfqs/{rfq_id}/quote")
async def submit_quote(
    rfq_id: str,
    quote_data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Submit a quote for an RFQ"""
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    if rfq.status.value not in ['sent', 'quotes_received'] if hasattr(rfq.status, 'value') else rfq.status not in ['sent', 'quotes_received']:
        raise HTTPException(status_code=400, detail="RFQ is no longer accepting quotes")
    
    if rfq.quote_deadline and rfq.quote_deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="RFQ deadline has passed")
    
    # Check existing quote
    existing = db.query(VendorQuote).filter(
        VendorQuote.rfq_id == rfq_id,
        VendorQuote.vendor_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a quote")
    
    # Convert items to line_items JSON format
    line_items = []
    for item in quote_data.items:
        line_items.append({
            "part_number": item.part_number,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": item.unit_price * item.quantity,
            "notes": item.notes
        })
    
    # Create quote
    quote = VendorQuote(
        rfq_id=rfq_id,
        vendor_id=current_user.id,
        line_items=line_items,
        subtotal=quote_data.total_amount,
        total_amount=quote_data.total_amount,
        delivery_days=quote_data.delivery_days,
        valid_until=datetime.utcnow() + timedelta(days=quote_data.validity_days),
        vendor_notes=quote_data.notes,
        status='submitted',
        submitted_at=datetime.utcnow()
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    
    return {
        "message": "Quote submitted successfully",
        "quote_id": str(quote.id),
        "total_amount": float(quote.total_amount)
    }


@router.get("/quotes")
async def get_my_quotes(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Get vendor's submitted quotes"""
    query = db.query(VendorQuote).filter(VendorQuote.vendor_id == current_user.id)
    
    if status:
        query = query.filter(VendorQuote.status == status)
    
    total = query.count()
    quotes = query.order_by(VendorQuote.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "quotes": [{
            "id": str(q.id),
            "rfq_id": str(q.rfq_id),
            "total_amount": float(q.total_amount),
            "delivery_days": q.delivery_days,
            "status": q.status.value if hasattr(q.status, 'value') else q.status,
            "items_count": len(q.line_items or []),
            "created_at": q.created_at.isoformat()
        } for q in quotes],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size
    }


@router.get("/orders")
async def get_vendor_orders(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Get vendor's accepted orders"""
    query = db.query(VendorQuote).filter(
        VendorQuote.vendor_id == current_user.id,
        VendorQuote.status == 'selected'
    )
    
    total = query.count()
    orders = query.order_by(VendorQuote.updated_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "orders": [{
            "id": str(o.id),
            "rfq_id": str(o.rfq_id),
            "job_number": o.rfq.job_card.job_number if o.rfq and o.rfq.job_card else None,
            "total_amount": float(o.total_amount),
            "items": o.line_items or [],
            "delivery_days": o.delivery_days,
            "status": "confirmed",  # Order status
            "created_at": o.created_at.isoformat()
        } for o in orders],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size
    }


@router.post("/orders/{order_id}/ship")
async def mark_order_shipped(
    order_id: str,
    tracking_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["vendor"]))
):
    """Mark order as shipped"""
    order = db.query(VendorQuote).filter(
        VendorQuote.id == order_id,
        VendorQuote.vendor_id == current_user.id,
        VendorQuote.status == 'selected'
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update delivery notes with tracking info
    shipping_info = f"Shipped on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    if tracking_number:
        shipping_info += f" | Tracking: {tracking_number}"
    
    order.delivery_notes = shipping_info
    db.commit()
    
    # Notify garage about shipment
    if order.rfq and order.rfq.job_card:
        job = order.rfq.job_card
        # Could send notification to service advisor
    
    return {"message": "Order marked as shipped"}

