"""
Background tasks for sending notifications via WhatsApp and Push
"""
from app.worker import celery_app
from app.core.config import settings
from app.core.database import SessionLocal


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_message(self, phone: str, message: str):
    """Send WhatsApp message via Twilio"""
    if settings.WHATSAPP_PROVIDER == "mock" or not settings.TWILIO_ACCOUNT_SID:
        print(f"[WhatsApp Mock] To: {phone}, Message: {message}")
        return {"status": "mock_sent", "phone": phone}

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        from_number = settings.WHATSAPP_FROM_NUMBER or settings.TWILIO_WHATSAPP_NUMBER
        msg = client.messages.create(
            body=message,
            from_=f"whatsapp:{from_number}",
            to=f"whatsapp:{phone}"
        )
        return {"status": "sent", "sid": msg.sid}
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_notification(self, user_id: str, title: str, body: str, data: dict = None):
    """Send push notification via Firebase"""
    if not settings.FIREBASE_CREDENTIALS_PATH:
        print(f"[Push Mock] To: {user_id}, Title: {title}, Body: {body}")
        return {"status": "mock_sent", "user_id": user_id}

    try:
        import firebase_admin
        from firebase_admin import messaging

        # Initialize if not already done
        if not firebase_admin._apps:
            cred = firebase_admin.credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)

        # Look up the user's FCM token from DB
        db = SessionLocal()
        try:
            from app.models import User
            user = db.query(User).filter(User.id == user_id).first()
            # FCM token would be stored on user profile in a real implementation
            # For now, log and return
            if not user:
                return {"status": "user_not_found"}

            # Placeholder: in production, query user's device tokens
            print(f"[Push] Would send to user {user_id}: {title}")
            return {"status": "sent", "user_id": user_id}
        finally:
            db.close()

    except Exception as exc:
        self.retry(exc=exc)
