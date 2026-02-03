"""
Multi-Branch Service - Tenant Isolation & Branch Management
"""
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException

from app.models import User, Branch, JobCard


class BranchService:
    """Service for multi-branch management and tenant isolation"""
    
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
    
    def get_user_branch_ids(self) -> List[str]:
        """Get all branch IDs the user has access to"""
        if self.current_user.role == "admin":
            # Admins can see all branches
            branches = self.db.query(Branch.id).all()
            return [str(b.id) for b in branches]
        elif self.current_user.branch_id:
            # Other staff can only see their assigned branch
            return [str(self.current_user.branch_id)]
        else:
            return []
    
    def filter_by_branch(self, query, model_class, include_unassigned: bool = False):
        """
        Apply branch filtering to a query based on user's access
        
        Args:
            query: SQLAlchemy query object
            model_class: The model class being queried (must have branch_id)
            include_unassigned: Whether to include records with no branch
            
        Returns:
            Filtered query
        """
        if self.current_user.role == "admin":
            # Admins see everything
            return query
        
        if self.current_user.role == "customer":
            # Customers see their own data across all branches
            return query
        
        # Staff see only their branch
        branch_ids = self.get_user_branch_ids()
        
        if not branch_ids:
            # No branch access - return empty
            return query.filter(False)
        
        if include_unassigned:
            return query.filter(
                or_(
                    model_class.branch_id.in_(branch_ids),
                    model_class.branch_id.is_(None)
                )
            )
        else:
            return query.filter(model_class.branch_id.in_(branch_ids))
    
    def validate_branch_access(self, branch_id: Optional[str]) -> bool:
        """Check if user has access to a specific branch"""
        if not branch_id:
            return True
        
        if self.current_user.role == "admin":
            return True
        
        return str(self.current_user.branch_id) == branch_id
    
    def ensure_branch_access(self, branch_id: str):
        """Raise exception if user doesn't have branch access"""
        if not self.validate_branch_access(branch_id):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this branch"
            )
    
    def get_default_branch_id(self) -> Optional[str]:
        """Get user's default branch ID"""
        if self.current_user.branch_id:
            return str(self.current_user.branch_id)
        
        # For admins without assigned branch, get first active branch
        if self.current_user.role == "admin":
            branch = self.db.query(Branch).filter(Branch.is_active == True).first()
            if branch:
                return str(branch.id)
        
        return None
    
    def set_branch_for_record(self, record, branch_id: Optional[str] = None):
        """Set branch_id for a new record"""
        if branch_id:
            self.ensure_branch_access(branch_id)
            record.branch_id = branch_id
        else:
            record.branch_id = self.get_default_branch_id()
        
        return record


class BranchContext:
    """
    Context manager for branch-scoped operations.
    Use this to temporarily switch branch context for operations.
    """
    
    def __init__(self, db: Session, branch_id: str):
        self.db = db
        self.branch_id = branch_id
        self._original_search_path = None
    
    def __enter__(self):
        # For PostgreSQL RLS (Row Level Security), you could set session variable
        # self.db.execute(f"SET app.current_branch_id = '{self.branch_id}'")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Reset context
        # self.db.execute("RESET app.current_branch_id")
        pass
    
    def filter_query(self, query, model_class):
        """Filter query to current branch"""
        return query.filter(model_class.branch_id == self.branch_id)


# Branch-specific aggregations
def get_branch_dashboard_stats(db: Session, branch_id: str) -> dict:
    """Get dashboard statistics for a specific branch"""
    from sqlalchemy import func
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = db.query(JobCard).filter(JobCard.branch_id == branch_id)
    
    total_jobs = query.count()
    pending_jobs = query.filter(
        JobCard.status.in_(['requested', 'scheduled', 'vehicle_picked', 'in_intake'])
    ).count()
    in_progress = query.filter(
        JobCard.status.in_(['diagnosed', 'in_service', 'testing'])
    ).count()
    completed_today = query.filter(
        JobCard.status.in_(['delivered', 'closed']),
        JobCard.updated_at >= today
    ).count()
    
    # Revenue
    revenue = db.query(func.sum(JobCard.amount_paid)).filter(
        JobCard.branch_id == branch_id,
        JobCard.updated_at >= today
    ).scalar() or 0
    
    return {
        "total_jobs": total_jobs,
        "pending_jobs": pending_jobs,
        "in_progress": in_progress,
        "completed_today": completed_today,
        "today_revenue": float(revenue)
    }


def get_branch_staff(db: Session, branch_id: str) -> List[User]:
    """Get all staff members assigned to a branch"""
    return db.query(User).filter(
        User.branch_id == branch_id,
        User.role != "customer",
        User.is_active == True
    ).all()


def transfer_job_to_branch(db: Session, job_id: str, target_branch_id: str, user: User) -> JobCard:
    """Transfer a job to another branch"""
    job = db.query(JobCard).filter(JobCard.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate user has access to both branches
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can transfer jobs")
    
    # Validate target branch
    target_branch = db.query(Branch).filter(Branch.id == target_branch_id).first()
    if not target_branch:
        raise HTTPException(status_code=404, detail="Target branch not found")
    
    old_branch_id = job.branch_id
    job.branch_id = target_branch_id
    job.updated_at = datetime.utcnow()
    
    # Clear assignees when transferring
    job.assigned_advisor_id = None
    job.assigned_technician_id = None
    
    db.commit()
    db.refresh(job)
    
    # Log the transfer
    # Could add audit log here
    
    return job
