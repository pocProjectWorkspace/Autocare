"""
Database Configuration
Supports: Neon (serverless PostgreSQL), local PostgreSQL, or SQLite for dev
"""
import uuid
import os
from sqlalchemy import TypeDecorator, CHAR, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.config import settings

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(32) for SQLite.
    Automatically handles string/UUID conversion in queries.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except (ValueError, AttributeError):
                return value
        
        if dialect.name == 'postgresql':
            return str(value)
        else:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value

# Portable UUID type for both PG and SQLite
UUID = GUID

DATABASE_URL = settings.DATABASE_URL

# Neon requires SSL mode
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

# Check if this is a Neon connection (contains neon.tech)
if "neon.tech" in DATABASE_URL or "neon" in DATABASE_URL.lower():
    print("🚀 Connecting to Neon PostgreSQL...")
    # Neon requires SSL
    connect_args = {"sslmode": "require"}
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
elif "sqlite" in DATABASE_URL:
    print("📦 Using SQLite...")
    connect_args = {"check_same_thread": False}
    # Remove pool options for SQLite
    engine_kwargs = {}
else:
    print("🐘 Connecting to PostgreSQL...")
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
