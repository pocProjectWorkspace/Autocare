"""
Branch Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import User, Branch
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse, BranchListResponse

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("", response_model=BranchListResponse)
async def list_branches(
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all active branches"""
    query = db.query(Branch).filter(Branch.is_active == True)
    if city:
        query = query.filter(Branch.city == city)
    branches = query.all()
    return BranchListResponse(branches=branches, total=len(branches))


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(branch_id: UUID, db: Session = Depends(get_db)):
    """Get branch details"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    data: BranchCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create new branch (Admin only)"""
    existing = db.query(Branch).filter(Branch.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Branch code already exists")
    
    branch = Branch(organization_id=current_user.organization_id, **data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    data: BranchUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update branch (Admin only)"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch
