"""
Upload Routes
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List

from app.core.deps import get_current_user
from app.models import User
from app.services.storage_service import StorageService

router = APIRouter(prefix="/upload", tags=["Uploads"])


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "uploads",
    current_user: User = Depends(get_current_user)
):
    """Upload a single file"""
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large")
    
    storage = StorageService()
    content = await file.read()
    url = storage.upload_file(content, file.filename, folder)
    return {"url": url, "filename": file.filename}


@router.post("/multiple")
async def upload_multiple(
    files: List[UploadFile] = File(...),
    folder: str = "uploads",
    current_user: User = Depends(get_current_user)
):
    """Upload multiple files"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files")
    
    storage = StorageService()
    urls = []
    for file in files:
        if file.size > 10 * 1024 * 1024:
            continue
        content = await file.read()
        url = storage.upload_file(content, file.filename, folder)
        urls.append({"url": url, "filename": file.filename})
    
    return {"files": urls}
