"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True
    
    # App
    APP_NAME: str = "AutoCare"
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:19006"
    
    # Database
    DATABASE_URL: str = "postgresql://autocare:autocare_secret@localhost:5432/autocare_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET: str = "your-super-secret-jwt-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 5
    OTP_LENGTH: int = 6
    
    # S3 Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin123"
    S3_BUCKET: str = "autocare"
    S3_REGION: str = "us-east-1"
    
    # WhatsApp
    WHATSAPP_PROVIDER: str = "mock"
    WHATSAPP_API_KEY: str = ""
    WHATSAPP_PHONE_NUMBER: str = ""
    
    # Payment
    PAYMENT_PROVIDER: str = "mock"
    PAYMENT_API_KEY: str = ""
    PAYMENT_SECRET: str = ""
    
    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    
    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_SECRET: str = ""
    
    # Twilio / WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""
    WHATSAPP_FROM_NUMBER: str = ""

    # Firebase / Push Notifications
    FIREBASE_CREDENTIALS_PATH: str = ""

    # Vehicle Lookup API
    VEHICLE_LOOKUP_API_KEY: str = ""
    VEHICLE_LOOKUP_API_URL: str = ""
    
    # Business Rules
    DEFAULT_DEPOSIT_PERCENTAGE: int = 50
    MAX_RFQ_VENDORS: int = 5
    QUOTE_SELECTION_RULE: str = "cheapest_available"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
