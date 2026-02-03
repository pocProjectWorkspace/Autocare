"""
Notification and Update Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.models.notification import NotificationType, NotificationChannel


class NotificationResponse(BaseModel):
    id: UUID
    notification_type: NotificationType
    title: str
    message: str
    channel: NotificationChannel
    is_read: bool
    data: Optional[Dict[str, Any]] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int
    total: int


class MarkReadRequest(BaseModel):
    notification_ids: List[UUID]


# Job Updates
class JobUpdateCreate(BaseModel):
    title: str
    message: str
    media_urls: List[str] = []
    is_visible_to_customer: bool = True


class JobUpdateResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    created_by_id: UUID
    created_by_name: Optional[str] = None
    title: str
    message: str
    media_urls: List[str] = []
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    is_visible_to_customer: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobUpdateListResponse(BaseModel):
    updates: List[JobUpdateResponse]
    total: int
