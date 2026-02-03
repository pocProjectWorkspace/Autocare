"""
Payment Gateway Integration - Stripe & PayPal APIs
"""
import stripe
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class StripeGateway:
    """Stripe payment gateway integration"""
    
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
    
    async def create_payment_intent(
        self,
        amount: float,
        currency: str = "AED",
        customer_email: str = None,
        metadata: Dict[str, str] = None,
        description: str = None
    ) -> Dict[str, Any]:
        """Create a Stripe PaymentIntent"""
        try:
            amount_in_fils = int(amount * 100)
            
            intent = stripe.PaymentIntent.create(
                amount=amount_in_fils,
                currency=currency.lower(),
                receipt_email=customer_email,
                metadata=metadata or {},
                description=description or "AutoCare Service Payment",
                automatic_payment_methods={"enabled": True},
            )
            
            logger.info(f"Created Stripe PaymentIntent: {intent.id}")
            
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "amount": amount,
                "currency": currency,
                "status": intent.status,
                "provider": "stripe"
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise ValueError(f"Payment creation failed: {str(e)}")
    
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve and verify a Stripe payment"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
                "amount": intent.amount / 100,
                "currency": intent.currency.upper(),
                "paid": intent.status == "succeeded",
                "receipt_url": intent.charges.data[0].receipt_url if intent.charges.data else None
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe retrieval error: {str(e)}")
            raise ValueError(f"Payment verification failed: {str(e)}")
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Create a refund"""
        try:
            params = {"payment_intent": payment_intent_id, "reason": reason}
            if amount:
                params["amount"] = int(amount * 100)
            
            refund = stripe.Refund.create(**params)
            
            return {
                "refund_id": refund.id,
                "amount": refund.amount / 100,
                "status": refund.status,
                "reason": refund.reason
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund error: {str(e)}")
            raise ValueError(f"Refund failed: {str(e)}")
    
    def verify_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """Verify and parse Stripe webhook"""
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            return {"type": event["type"], "data": event["data"]["object"]}
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid webhook signature")


class PayPalGateway:
    """PayPal payment gateway integration"""
    
    BASE_URL = "https://api-m.sandbox.paypal.com" if settings.DEBUG else "https://api-m.paypal.com"
    
    async def _get_token(self) -> str:
        """Get PayPal access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/v1/oauth2/token",
                auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_SECRET),
                data={"grant_type": "client_credentials"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code != 200:
                raise ValueError("PayPal authentication failed")
            return response.json()["access_token"]
    
    async def create_order(
        self,
        amount: float,
        currency: str = "AED",
        description: str = None,
        return_url: str = None,
        cancel_url: str = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create PayPal checkout order"""
        try:
            token = await self._get_token()
            
            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                    "description": description or "AutoCare Service Payment",
                    "custom_id": metadata.get("job_id") if metadata else None
                }],
                "application_context": {
                    "return_url": return_url or f"{settings.FRONTEND_URL}/payment/success",
                    "cancel_url": cancel_url or f"{settings.FRONTEND_URL}/payment/cancel",
                    "brand_name": "AutoCare",
                    "user_action": "PAY_NOW"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/v2/checkout/orders",
                    json=order_data,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError("PayPal order creation failed")
                
                order = response.json()
                approval_url = next(
                    (link["href"] for link in order["links"] if link["rel"] == "approve"), None
                )
                
                return {
                    "order_id": order["id"],
                    "approval_url": approval_url,
                    "amount": amount,
                    "currency": currency,
                    "status": order["status"],
                    "provider": "paypal"
                }
        except Exception as e:
            logger.error(f"PayPal order error: {str(e)}")
            raise ValueError(f"PayPal order creation failed: {str(e)}")
    
    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Capture an approved PayPal order"""
        try:
            token = await self._get_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/v2/checkout/orders/{order_id}/capture",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                )
                
                if response.status_code not in [200, 201]:
                    raise ValueError("PayPal capture failed")
                
                capture = response.json()
                purchase_unit = capture["purchase_units"][0]
                payment = purchase_unit["payments"]["captures"][0]
                
                return {
                    "order_id": order_id,
                    "capture_id": payment["id"],
                    "amount": float(payment["amount"]["value"]),
                    "currency": payment["amount"]["currency_code"],
                    "status": capture["status"],
                    "paid": capture["status"] == "COMPLETED"
                }
        except Exception as e:
            logger.error(f"PayPal capture error: {str(e)}")
            raise ValueError(f"PayPal capture failed: {str(e)}")


# Singleton instances
stripe_gateway = StripeGateway()
paypal_gateway = PayPalGateway()
