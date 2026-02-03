"""
Reports API - Analytics and Export
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional
import io
import csv

from app.core.deps import get_db, get_current_user, require_role
from app.models import User, JobCard, Payment, Vehicle, Branch

router = APIRouter(tags=["Reports"])


@router.get("/dashboard")
async def get_dashboard_stats(
    branch_id: Optional[str] = None,
    period: str = Query("today", regex="^(today|week|month|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "service_advisor"]))
):
    """Get dashboard statistics"""
    now = datetime.utcnow()
    
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365)
    
    query = db.query(JobCard).filter(JobCard.created_at >= start_date)
    if branch_id:
        query = query.filter(JobCard.branch_id == branch_id)
    
    jobs = query.all()
    
    # Job counts by status
    status_counts = {}
    for job in jobs:
        status_counts[job.status] = status_counts.get(job.status, 0) + 1
    
    # Revenue
    paid_jobs = [j for j in jobs if j.status in ['delivered', 'closed']]
    total_revenue = sum(j.amount_paid or 0 for j in paid_jobs)
    pending_revenue = sum(j.balance_due or 0 for j in jobs)
    
    # Completed today
    completed_today = db.query(JobCard).filter(
        JobCard.updated_at >= now.replace(hour=0, minute=0, second=0),
        JobCard.status.in_(['delivered', 'closed'])
    ).count()
    
    return {
        "period": period,
        "total_jobs": len(jobs),
        "status_breakdown": status_counts,
        "pending_jobs": sum(1 for j in jobs if j.status not in ['delivered', 'closed', 'cancelled']),
        "in_progress": sum(1 for j in jobs if j.status in ['in_intake', 'diagnosed', 'in_service', 'testing']),
        "completed_today": completed_today,
        "total_revenue": total_revenue,
        "pending_revenue": pending_revenue,
        "avg_job_value": total_revenue / len(paid_jobs) if paid_jobs else 0,
    }


@router.get("/jobs-by-status")
async def get_jobs_by_status(
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "service_advisor"]))
):
    """Get job count breakdown by status"""
    query = db.query(
        JobCard.status,
        func.count(JobCard.id).label('count')
    ).group_by(JobCard.status)
    
    if branch_id:
        query = query.filter(JobCard.branch_id == branch_id)
    
    results = query.all()
    return [{"status": r.status, "count": r.count} for r in results]


@router.get("/revenue-trend")
async def get_revenue_trend(
    days: int = Query(30, ge=7, le=365),
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get daily revenue trend"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(
        func.date(Payment.paid_at).label('date'),
        func.sum(Payment.amount).label('revenue')
    ).filter(
        Payment.paid_at >= start_date,
        Payment.status == 'completed'
    ).group_by(func.date(Payment.paid_at)).order_by('date')
    
    if branch_id:
        query = query.join(JobCard).filter(JobCard.branch_id == branch_id)
    
    results = query.all()
    return [{"date": str(r.date), "revenue": float(r.revenue or 0)} for r in results]


@router.get("/service-type-breakdown")
async def get_service_type_breakdown(
    period: str = Query("month", regex="^(week|month|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "service_advisor"]))
):
    """Get job breakdown by service type"""
    if period == "week":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        start_date = datetime.utcnow() - timedelta(days=30)
    else:
        start_date = datetime.utcnow() - timedelta(days=365)
    
    results = db.query(
        JobCard.service_type,
        func.count(JobCard.id).label('count'),
        func.sum(JobCard.grand_total).label('revenue')
    ).filter(
        JobCard.created_at >= start_date
    ).group_by(JobCard.service_type).all()
    
    return [{
        "service_type": r.service_type,
        "count": r.count,
        "revenue": float(r.revenue or 0)
    } for r in results]


@router.get("/branch-performance")
async def get_branch_performance(
    period: str = Query("month", regex="^(week|month|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get performance metrics by branch"""
    if period == "week":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        start_date = datetime.utcnow() - timedelta(days=30)
    else:
        start_date = datetime.utcnow() - timedelta(days=365)
    
    results = db.query(
        Branch.name,
        func.count(JobCard.id).label('job_count'),
        func.sum(JobCard.grand_total).label('revenue'),
        func.avg(JobCard.grand_total).label('avg_ticket')
    ).join(JobCard, Branch.id == JobCard.branch_id).filter(
        JobCard.created_at >= start_date
    ).group_by(Branch.id, Branch.name).all()
    
    return [{
        "branch_name": r.name,
        "job_count": r.job_count,
        "revenue": float(r.revenue or 0),
        "avg_ticket": float(r.avg_ticket or 0)
    } for r in results]


@router.get("/customer-insights")
async def get_customer_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get customer analytics"""
    total_customers = db.query(User).filter(User.role == 'customer').count()
    
    # Top customers by spend
    top_customers = db.query(
        User.full_name,
        func.count(JobCard.id).label('job_count'),
        func.sum(JobCard.amount_paid).label('total_spend')
    ).join(JobCard, User.id == JobCard.customer_id).filter(
        User.role == 'customer'
    ).group_by(User.id, User.full_name).order_by(
        func.sum(JobCard.amount_paid).desc()
    ).limit(10).all()
    
    # New customers this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    new_customers = db.query(User).filter(
        User.role == 'customer',
        User.created_at >= month_start
    ).count()
    
    return {
        "total_customers": total_customers,
        "new_this_month": new_customers,
        "top_customers": [{
            "name": c.full_name,
            "jobs": c.job_count,
            "spend": float(c.total_spend or 0)
        } for c in top_customers]
    }


@router.get("/export/jobs")
async def export_jobs_csv(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Export jobs to CSV"""
    query = db.query(JobCard)
    
    if start_date:
        query = query.filter(JobCard.created_at >= start_date)
    if end_date:
        query = query.filter(JobCard.created_at <= end_date)
    if status:
        query = query.filter(JobCard.status == status)
    
    jobs = query.order_by(JobCard.created_at.desc()).limit(1000).all()
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Job Number', 'Customer', 'Vehicle', 'Service Type', 'Status',
        'Created', 'Total', 'Paid', 'Balance'
    ])
    
    for job in jobs:
        writer.writerow([
            job.job_number,
            job.customer.full_name if job.customer else '',
            f"{job.vehicle.plate_number} - {job.vehicle.make} {job.vehicle.model}" if job.vehicle else '',
            job.service_type,
            job.status,
            job.created_at.isoformat(),
            job.grand_total or 0,
            job.amount_paid or 0,
            job.balance_due or 0
        ])
    
    return {
        "csv_data": output.getvalue(),
        "filename": f"jobs_export_{datetime.utcnow().strftime('%Y%m%d')}.csv",
        "count": len(jobs)
    }
