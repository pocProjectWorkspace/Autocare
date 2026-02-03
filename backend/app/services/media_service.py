"""
Media/Upload Service - S3 Compatible Storage
"""
import uuid
import mimetypes
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class MediaService:
    """Service for handling media uploads to S3-compatible storage"""
    
    # Allowed file types
    ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
    ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
    
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
    MAX_DOC_SIZE = 5 * 1024 * 1024  # 5MB
    
    @classmethod
    def _get_client(cls):
        """Get S3 client"""
        return boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION or 'us-east-1'
        )
    
    @classmethod
    def upload_file(
        cls,
        file_data: bytes,
        filename: str,
        content_type: str,
        category: str,
        job_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> dict:
        """
        Upload file to S3
        
        Args:
            file_data: Raw file bytes
            filename: Original filename
            content_type: MIME type
            category: Upload category (intake, diagnosis, service, qc, delivery, document)
            job_id: Associated job ID
            user_id: Uploading user ID
            
        Returns:
            dict with url, key, size
        """
        # Validate content type
        allowed_types = cls.ALLOWED_IMAGE_TYPES + cls.ALLOWED_VIDEO_TYPES + cls.ALLOWED_DOC_TYPES
        if content_type not in allowed_types:
            raise ValueError(f"File type not allowed: {content_type}")
        
        # Check size
        size = len(file_data)
        if content_type in cls.ALLOWED_VIDEO_TYPES:
            if size > cls.MAX_VIDEO_SIZE:
                raise ValueError(f"Video too large. Max: {cls.MAX_VIDEO_SIZE // 1024 // 1024}MB")
        elif content_type in cls.ALLOWED_IMAGE_TYPES:
            if size > cls.MAX_IMAGE_SIZE:
                raise ValueError(f"Image too large. Max: {cls.MAX_IMAGE_SIZE // 1024 // 1024}MB")
        else:
            if size > cls.MAX_DOC_SIZE:
                raise ValueError(f"Document too large. Max: {cls.MAX_DOC_SIZE // 1024 // 1024}MB")
        
        # Generate unique key
        ext = Path(filename).suffix or mimetypes.guess_extension(content_type) or '.bin'
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().strftime('%Y%m%d')
        
        if job_id:
            key = f"jobs/{job_id}/{category}/{timestamp}_{unique_id}{ext}"
        else:
            key = f"uploads/{category}/{timestamp}_{unique_id}{ext}"
        
        try:
            client = cls._get_client()
            
            client.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=file_data,
                ContentType=content_type,
                Metadata={
                    'original-filename': filename,
                    'category': category,
                    'uploaded-by': user_id or 'system',
                    'job-id': job_id or ''
                }
            )
            
            # Generate URL
            if settings.S3_ENDPOINT_URL:
                url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}"
            else:
                url = f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
            
            logger.info(f"Uploaded file: {key}")
            
            return {
                "url": url,
                "key": key,
                "size": size,
                "content_type": content_type,
                "filename": filename
            }
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            raise ValueError(f"Upload failed: {str(e)}")
    
    @classmethod
    def get_signed_url(cls, key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for private files"""
        try:
            client = cls._get_client()
            url = client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating signed URL: {str(e)}")
            raise
    
    @classmethod
    def delete_file(cls, key: str) -> bool:
        """Delete file from S3"""
        try:
            client = cls._get_client()
            client.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key
            )
            logger.info(f"Deleted file: {key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting file: {str(e)}")
            return False
    
    @classmethod
    def list_job_files(cls, job_id: str, category: Optional[str] = None) -> List[dict]:
        """List all files for a job"""
        try:
            client = cls._get_client()
            prefix = f"jobs/{job_id}/"
            if category:
                prefix += f"{category}/"
            
            response = client.list_objects_v2(
                Bucket=settings.S3_BUCKET_NAME,
                Prefix=prefix
            )
            
            files = []
            for obj in response.get('Contents', []):
                key = obj['Key']
                if settings.S3_ENDPOINT_URL:
                    url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}"
                else:
                    url = f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
                
                files.append({
                    "key": key,
                    "url": url,
                    "size": obj['Size'],
                    "last_modified": obj['LastModified'].isoformat(),
                    "category": key.split('/')[2] if len(key.split('/')) > 2 else 'other'
                })
            
            return files
            
        except ClientError as e:
            logger.error(f"Error listing files: {str(e)}")
            return []
    
    @classmethod
    def get_upload_presigned_url(
        cls,
        filename: str,
        content_type: str,
        category: str,
        job_id: Optional[str] = None,
        expires_in: int = 3600
    ) -> dict:
        """Generate presigned URL for direct upload from client"""
        ext = Path(filename).suffix or '.bin'
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().strftime('%Y%m%d')
        
        if job_id:
            key = f"jobs/{job_id}/{category}/{timestamp}_{unique_id}{ext}"
        else:
            key = f"uploads/{category}/{timestamp}_{unique_id}{ext}"
        
        try:
            client = cls._get_client()
            
            presigned = client.generate_presigned_post(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Fields={
                    'Content-Type': content_type
                },
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 1, cls.MAX_VIDEO_SIZE]
                ],
                ExpiresIn=expires_in
            )
            
            if settings.S3_ENDPOINT_URL:
                final_url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}"
            else:
                final_url = f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
            
            return {
                "upload_url": presigned['url'],
                "fields": presigned['fields'],
                "key": key,
                "final_url": final_url
            }
            
        except ClientError as e:
            logger.error(f"Error generating presigned upload URL: {str(e)}")
            raise
