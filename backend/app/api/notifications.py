"""
Notification Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.notification import NotificationResponse, NotificationListResponse, MarkReadRequest
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user notifications"""
    service = NotificationService(db, org_id=current_user.organization_id)
    notifications = service.get_user_notifications(current_user.id, unread_only, limit)
    unread = sum(1 for n in notifications if not n.is_read)
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread,
        total=len(notifications)
    )


@router.post("/read")
async def mark_as_read(
    data: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notifications as read"""
    service = NotificationService(db, org_id=current_user.organization_id)
    service.mark_as_read(data.notification_ids, current_user.id)
    return {"message": "Marked as read"}
