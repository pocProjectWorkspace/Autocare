"""
Notification and Update Models
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    JOB_STATUS = "job_status"
    STATUS_UPDATE = "status_update"
    ESTIMATE_READY = "estimate_ready"
    PARTS_QUOTE_READY = "parts_quote_ready"
    PAYMENT_REQUEST = "payment_request"
    PAYMENT_RECEIVED = "payment_received"
    RFQ_RECEIVED = "rfq_received"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"


class Notification(Base):
    """System notifications for users"""
    __tablename__ = "notifications"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=True)

    notification_type = Column(Enum(NotificationType), default=NotificationType.INFO)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Context data
    data = Column(JSON, nullable=True)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job_card = relationship("JobCard")


class JobUpdate(Base):
    """Progress updates for job cards (Technician notes, photos, etc.)"""
    __tablename__ = "job_updates"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    created_by_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    media_urls = Column(JSON, default=list)
    
    is_visible_to_customer = Column(Boolean, default=True)
    
    # Status changes if applicable
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="updates")
    created_by = relationship("User")


class AuditLog(Base):
    """Detailed audit logs for all system actions"""
    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=True)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=True)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    action = Column(String(100), nullable=False)  # created, status_change, etc.
    description = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # Detailed diff or extra info
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard")
    user = relationship("User")
