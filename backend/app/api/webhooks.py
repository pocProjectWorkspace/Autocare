"""
Webhook Routes - External service callbacks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models import Payment, PaymentStatus, JobCard, JobStatus
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    payload = await request.body()

    # In production, verify signature with stripe.Webhook.construct_event
    if settings.STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            import stripe
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        # Dev mode: parse JSON directly
        import json
        event = json.loads(payload)

    event_type = event.get("type", "")

    if event_type == "payment_intent.succeeded":
        data = event["data"]["object"]
        payment_id = data.get("metadata", {}).get("payment_id")
        if payment_id:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.COMPLETED
                payment.gateway_transaction_id = data.get("id")
                payment.gateway_response = data
                from datetime import datetime
                payment.paid_at = datetime.utcnow()

                # Update job totals
                job = payment.job_card
                job.amount_paid += payment.amount
                job.balance_due = job.grand_total - job.amount_paid
                if job.balance_due <= 0:
                    job.status = JobStatus.PAID
                elif job.status == JobStatus.AWAITING_PAYMENT:
                    job.status = JobStatus.PARTIALLY_PAID

                db.commit()

                # Notify
                svc = NotificationService(db, org_id=payment.organization_id)
                svc.notify_payment_received(job, payment)

    elif event_type == "payment_intent.payment_failed":
        data = event["data"]["object"]
        payment_id = data.get("metadata", {}).get("payment_id")
        if payment_id:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.FAILED
                payment.gateway_response = data
                db.commit()

    return {"status": "ok"}
