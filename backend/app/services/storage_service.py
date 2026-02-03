"""
Storage Service for S3-compatible file uploads
"""
import boto3
from botocore.config import Config
from datetime import datetime
import uuid
import mimetypes
from app.core.config import settings


class StorageService:
    """S3-compatible storage service"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.S3_BUCKET
    
    def upload_file(self, file_content: bytes, filename: str, folder: str = "uploads") -> str:
        """Upload file and return URL"""
        ext = filename.split('.')[-1] if '.' in filename else ''
        key = f"{folder}/{datetime.now().strftime('%Y/%m/%d')}/{uuid.uuid4()}.{ext}"
        
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket, Key=key, Body=file_content,
                ContentType=content_type
            )
            return f"{settings.S3_ENDPOINT}/{self.bucket}/{key}"
        except Exception as e:
            print(f"Upload error: {e}")
            raise
    
    def delete_file(self, file_url: str) -> bool:
        """Delete file by URL"""
        try:
            key = file_url.split(f"{self.bucket}/")[-1]
            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False
    
    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL for download"""
        return self.s3_client.generate_presigned_url(
            'get_object', 
            Params={'Bucket': self.bucket, 'Key': key}, 
            ExpiresIn=expires_in
        )
