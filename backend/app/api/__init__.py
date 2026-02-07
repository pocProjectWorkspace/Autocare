"""
API Router - All API endpoints consolidated
"""
from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.vehicles import router as vehicles_router
from app.api.branches import router as branches_router
from app.api.jobs import router as jobs_router
from app.api.rfq import router as rfq_router, vendor_router as rfq_vendor_router
from app.api.payments import router as payments_router
from app.api.notifications import router as notifications_router
from app.api.admin import router as admin_router
from app.api.uploads import router as uploads_router
from app.api.driver import router as driver_router
from app.api.vendor import router as vendor_router
from app.api.reports import router as reports_router
from app.api.websocket import router as websocket_router
from app.api.admin_users import router as admin_users_router
from app.api.organization import router as org_router
from app.api.webhooks import router as webhooks_router

router = APIRouter()

# Auth & Users
router.include_router(auth_router)

# Core Operations
router.include_router(vehicles_router)
router.include_router(branches_router)
router.include_router(jobs_router)

# RFQ & Parts
router.include_router(rfq_router)
router.include_router(rfq_vendor_router)

# Payments
router.include_router(payments_router)

# Notifications
router.include_router(notifications_router)

# Admin
router.include_router(admin_router)
router.include_router(admin_users_router, prefix="/admin")

# Uploads
router.include_router(uploads_router)

# Driver Module
router.include_router(driver_router, prefix="/driver")

# Vendor Module
router.include_router(vendor_router, prefix="/vendor")

# Reports & Analytics
router.include_router(reports_router, prefix="/reports")

# Organization
router.include_router(org_router)

# Webhooks (external callbacks)
router.include_router(webhooks_router)

# WebSocket for Real-time
router.include_router(websocket_router)

