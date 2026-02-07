"""
Organization Model - Multi-tenancy foundation
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class Organization(Base):
    """Organization / tenant model"""
    __tablename__ = "organizations"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    logo_url = Column(String(500), nullable=True)

    # Subscription
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    trial_ends_at = Column(DateTime, nullable=True)

    # Settings (JSON: currency, tax_rate, working_hours, notification_preferences)
    settings = Column(JSON, default=dict)

    # Limits
    max_branches = Column(Integer, default=2)
    max_users = Column(Integer, default=10)

    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])

    def __repr__(self):
        return f"<Organization {self.name} ({self.slug})>"
