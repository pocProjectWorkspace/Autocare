"""Core module"""
from app.core.config import settings
from app.core.database import get_db, SessionLocal, engine, Base
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    generate_token
)
from app.core.deps import (
    get_current_user,
    get_current_active_user,
    RoleChecker,
    require_admin,
    require_service_advisor,
    require_technician,
    require_driver,
    require_vendor,
    require_customer,
    require_staff
)
