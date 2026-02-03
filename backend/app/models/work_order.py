"""
Work Order and Task Management Models
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from app.core.database import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class WorkOrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class WorkOrder(Base):
    """Internal work order for technicians"""
    __tablename__ = "work_orders"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    technician_id = Column(UUID, ForeignKey("users.id"), nullable=True)
    
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.PENDING)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    actual_hours = Column(Float, default=0)
    
    notes = Column(Text, nullable=True)
    checklist = Column(JSON, nullable=True)  # QC Checklist items
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard", back_populates="work_orders")
    technician = relationship("User")
    tasks = relationship("WorkOrderTask", back_populates="work_order", cascade="all, delete-orphan")


class WorkOrderTask(Base):
    """Specific tasks within a work order"""
    __tablename__ = "work_order_tasks"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID, ForeignKey("work_orders.id"), nullable=False)
    
    description = Column(String(500), nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    
    estimated_hours = Column(Float, default=0)
    actual_hours = Column(Float, default=0)
    
    technician_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    work_order = relationship("WorkOrder", back_populates="tasks")


class QCChecklist(Base):
    """Quality Control Checklist templates and results"""
    __tablename__ = "qc_checklists"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_card_id = Column(UUID, ForeignKey("job_cards.id"), nullable=False)
    inspector_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    
    results = Column(JSON, nullable=False)  # Map of check items and results (pass/fail/na)
    passed_all = Column(Boolean, default=False)
    remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job_card = relationship("JobCard")
    inspector = relationship("User")
