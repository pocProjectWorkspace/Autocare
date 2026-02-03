"""
Work Order Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.work_order import WorkOrderStatus, TaskStatus


# Task
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_minutes: Optional[int] = None


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    notes: Optional[str] = None
    actual_minutes: Optional[int] = None


class TaskResponse(BaseModel):
    id: UUID
    work_order_id: UUID
    sequence: int
    title: str
    description: Optional[str] = None
    status: TaskStatus
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# Work Order
class WorkOrderCreate(BaseModel):
    technician_id: Optional[UUID] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    instructions: Optional[str] = None
    tasks: List[TaskCreate] = []


class WorkOrderUpdate(BaseModel):
    technician_id: Optional[UUID] = None
    status: Optional[WorkOrderStatus] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    instructions: Optional[str] = None
    completion_notes: Optional[str] = None


class WorkOrderResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    work_order_number: str
    technician_id: Optional[UUID] = None
    technician_name: Optional[str] = None
    status: WorkOrderStatus
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    instructions: Optional[str] = None
    completion_notes: Optional[str] = None
    tasks: List[TaskResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


# QC Checklist
class QCItem(BaseModel):
    item: str
    passed: bool
    notes: Optional[str] = None


class QCCreate(BaseModel):
    items: List[QCItem]
    notes: Optional[str] = None


class QCResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    performed_by_id: UUID
    items: List[dict]
    passed: bool
    notes: Optional[str] = None
    performed_at: datetime
    
    class Config:
        from_attributes = True
