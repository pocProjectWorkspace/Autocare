"""
Schemas Package
"""
from app.schemas.user import (
    UserBase, UserCreate, UserUpdate, UserResponse, UserListResponse,
    OTPRequest, OTPVerify, RegisterRequest, TokenResponse, RefreshTokenRequest,
    StaffCreate, VendorCreate
)
from app.schemas.vehicle import (
    VehicleBase, VehicleCreate, VehicleUpdate, VehicleResponse, VehicleListResponse
)
from app.schemas.branch import (
    BranchBase, BranchCreate, BranchUpdate, BranchResponse, BranchListResponse
)
from app.schemas.job_card import (
    BookingRequest, JobCardCreate, JobCardUpdate,
    EstimateItemCreate, EstimateCreate, EstimateItemResponse,
    JobCardBrief, JobCardResponse, JobCardListResponse,
    StatusUpdate, ApprovalRequest, DeliveryConfirmation, FeedbackSubmit
)
from app.schemas.intake import (
    DamageRecord, IntakeCreate, IntakeResponse,
    DiagnosisCreate, DiagnosisResponse
)
from app.schemas.rfq import (
    RFQPart, RFQCreate, RFQResponse, RFQWithQuotes,
    QuoteLineItem, QuoteSubmit, QuoteResponse, QuoteSelection
)
from app.schemas.payment import (
    PaymentCreate, PaymentLinkRequest, PaymentLinkResponse, PaymentResponse, PaymentListResponse,
    InvoiceLineItem, InvoiceCreate, InvoiceResponse
)
from app.schemas.notification import (
    NotificationResponse, NotificationListResponse, MarkReadRequest,
    JobUpdateCreate, JobUpdateResponse, JobUpdateListResponse
)
from app.schemas.work_order import (
    TaskCreate, TaskUpdate, TaskResponse,
    WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse,
    QCItem, QCCreate, QCResponse
)
from app.schemas.reports import (
    DateRangeFilter, JobStatusSummary, RevenueSummary,
    VendorQuoteComparison, TechnicianWorkload, DashboardStats
)
