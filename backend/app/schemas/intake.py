"""
Intake and Diagnosis Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# Intake
class DamageRecord(BaseModel):
    location: str
    description: str
    photo_url: Optional[str] = None


class IntakeCreate(BaseModel):
    odometer_reading: Optional[int] = None
    fuel_level: Optional[str] = None  # empty, quarter, half, three_quarter, full
    
    exterior_photos: List[str] = []
    exterior_damages: List[DamageRecord] = []
    exterior_notes: Optional[str] = None
    
    interior_photos: List[str] = []
    interior_condition: Optional[str] = None
    interior_notes: Optional[str] = None
    
    items_in_vehicle: List[str] = []
    items_photos: List[str] = []
    
    # Accessories
    spare_tyre: bool = False
    jack: bool = False
    toolkit: bool = False
    floor_mats: bool = False
    first_aid_kit: bool = False
    fire_extinguisher: bool = False


class IntakeResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    performed_by_id: UUID
    
    odometer_reading: Optional[int] = None
    fuel_level: Optional[str] = None
    
    exterior_photos: List[str] = []
    exterior_damages: List[Dict[str, Any]] = []
    exterior_notes: Optional[str] = None
    
    interior_photos: List[str] = []
    interior_condition: Optional[str] = None
    interior_notes: Optional[str] = None
    
    items_in_vehicle: List[str] = []
    items_photos: List[str] = []
    
    spare_tyre: bool
    jack: bool
    toolkit: bool
    floor_mats: bool
    first_aid_kit: bool
    fire_extinguisher: bool
    
    customer_acknowledged: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Diagnosis
class DiagnosisCreate(BaseModel):
    findings: str = Field(..., min_length=10)
    recommendations: Optional[str] = None
    diagnostic_photos: List[str] = []
    diagnostic_videos: List[str] = []
    severity: Optional[str] = None  # low, medium, high, critical
    requires_parts: bool = False
    estimated_labour_hours: Optional[float] = None
    estimated_completion_days: Optional[int] = None


class DiagnosisResponse(BaseModel):
    id: UUID
    job_card_id: UUID
    technician_id: UUID
    
    findings: str
    recommendations: Optional[str] = None
    diagnostic_photos: List[str] = []
    diagnostic_videos: List[str] = []
    severity: Optional[str] = None
    requires_parts: bool
    estimated_labour_hours: Optional[float] = None
    estimated_completion_days: Optional[int] = None
    
    diagnosed_at: datetime
    
    class Config:
        from_attributes = True
