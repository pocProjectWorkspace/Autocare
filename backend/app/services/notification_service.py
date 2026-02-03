"""
Notification Service
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Notification, NotificationType, NotificationChannel, JobCard, JobStatus, Payment, User, RFQ
from app.core.config import settings


class WhatsAppAdapter:
    """Adapter for WhatsApp Business API"""
    def __init__(self):
        self.provider = settings.WHATSAPP_PROVIDER
    
    def send_message(self, phone: str, message: str) -> bool:
        if self.provider == "mock":
            print(f"[WhatsApp] To: {phone}, Message: {message}")
            return True
        return True


class NotificationService:
    """Service for sending notifications"""
    
    def __init__(self, db: Session):
        self.db = db
        self.whatsapp_adapter = WhatsAppAdapter()
    
    def create_notification(self, user_id, notification_type: NotificationType, title: str, message: str,
                          job_card_id=None, channel: NotificationChannel = NotificationChannel.IN_APP, data: dict = None):
        notification = Notification(
            user_id=user_id, job_card_id=job_card_id, notification_type=notification_type,
            title=title, message=message, channel=channel, data=data or {}
        )
        self.db.add(notification)
        self.db.commit()
        
        if channel == NotificationChannel.WHATSAPP:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user and user.mobile:
                self.whatsapp_adapter.send_message(user.mobile, message)
                notification.is_sent = True
                notification.sent_at = datetime.utcnow()
                self.db.commit()
        return notification
    
    def notify_new_job(self, job: JobCard):
        staff = self.db.query(User).filter(User.branch_id == job.branch_id, User.is_active == True).all()
        for user in staff:
            self.create_notification(user.id, NotificationType.STATUS_UPDATE, "New Job Request",
                f"New request #{job.job_number}", job_card_id=job.id)
    
    def notify_status_change(self, job: JobCard, old_status: JobStatus, new_status: JobStatus):
        self.create_notification(job.customer_id, NotificationType.STATUS_UPDATE, f"Job #{job.job_number}",
            f"Status: {new_status.value}", job_card_id=job.id)
            
    def notify_job_update(self, job: JobCard, title: str, message: str):
        self.create_notification(job.customer_id, NotificationType.STATUS_UPDATE, f"Update: {title}",
            message, job_card_id=job.id)
    
    def notify_estimate_ready(self, job: JobCard):
        self.create_notification(job.customer_id, NotificationType.ESTIMATE_READY, "Estimate Ready",
            f"Total: AED {job.grand_total:.2f}", job_card_id=job.id)
    
    def notify_parts_quote_ready(self, job: JobCard):
        self.create_notification(job.customer_id, NotificationType.PARTS_QUOTE_READY, "Parts Quote Ready",
            "Please review and approve", job_card_id=job.id)
    
    def notify_payment_request(self, job: JobCard, payment: Payment):
        self.create_notification(job.customer_id, NotificationType.PAYMENT_REQUEST, "Payment Required",
            f"AED {payment.amount:.2f}", job_card_id=job.id, channel=NotificationChannel.WHATSAPP)
    
    def notify_payment_received(self, job: JobCard, payment: Payment):
        self.create_notification(job.customer_id, NotificationType.PAYMENT_RECEIVED, "Payment Received",
            f"AED {payment.amount:.2f} received", job_card_id=job.id)
    
    def notify_vendor_rfq(self, vendor: User, rfq: RFQ):
        self.create_notification(vendor.id, NotificationType.RFQ_RECEIVED, "New RFQ",
            f"RFQ #{rfq.rfq_number}", data={"rfq_id": str(rfq.id)})
    
    def get_user_notifications(self, user_id, unread_only: bool = False, limit: int = 50):
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    def mark_as_read(self, notification_ids: list, user_id):
        self.db.query(Notification).filter(Notification.id.in_(notification_ids), 
            Notification.user_id == user_id).update({"is_read": True, "read_at": datetime.utcnow()})
        self.db.commit()
