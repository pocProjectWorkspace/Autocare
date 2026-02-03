"""
Report Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class DateRangeFilter(BaseModel):
    start_date: date
    end_date: date


class JobStatusSummary(BaseModel):
    status: str
    count: int
    percentage: float


class RevenueSummary(BaseModel):
    total_revenue: float
    total_jobs: int
    average_job_value: float
    total_paid: float
    total_pending: float
    by_service_type: List[Dict[str, Any]]
    by_branch: List[Dict[str, Any]]


class VendorQuoteComparison(BaseModel):
    vendor_id: str
    vendor_name: str
    total_quotes: int
    selected_quotes: int
    average_price: float
    average_delivery_days: float
    selection_rate: float


class TechnicianWorkload(BaseModel):
    technician_id: str
    technician_name: str
    assigned_jobs: int
    completed_jobs: int
    in_progress_jobs: int
    average_completion_time: float  # hours


class DashboardStats(BaseModel):
    total_jobs: int
    pending_jobs: int
    in_progress_jobs: int
    completed_jobs: int
    today_revenue: float
    month_revenue: float
    pending_approvals: int
    pending_payments: int
    jobs_by_status: List[JobStatusSummary]
