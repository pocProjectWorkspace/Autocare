"""
WhatsApp Integration Service
"""
from typing import Optional
import httpx
import logging
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """WhatsApp Business API integration via Twilio"""
    
    BASE_URL = "https://api.twilio.com/2010-04-01"
    
    @classmethod
    def _get_client(cls):
        """Get HTTP client with auth"""
        return httpx.AsyncClient(
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=30.0
        )
    
    @classmethod
    async def send_message(
        cls,
        to_number: str,
        message: str,
        template_id: Optional[str] = None,
        template_vars: Optional[dict] = None
    ) -> dict:
        """Send WhatsApp message"""
        if not settings.TWILIO_ACCOUNT_SID or not settings.WHATSAPP_FROM_NUMBER:
            logger.warning("WhatsApp not configured, skipping message")
            return {"status": "skipped", "reason": "not_configured"}
        
        # Format phone number
        to_whatsapp = cls._format_number(to_number)
        from_whatsapp = f"whatsapp:{settings.WHATSAPP_FROM_NUMBER}"
        
        try:
            async with cls._get_client() as client:
                url = f"{cls.BASE_URL}/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                
                data = {
                    "From": from_whatsapp,
                    "To": to_whatsapp,
                    "Body": message
                }
                
                response = await client.post(url, data=data)
                result = response.json()
                
                if response.status_code >= 400:
                    logger.error(f"WhatsApp send failed: {result}")
                    return {"status": "error", "error": result}
                
                logger.info(f"WhatsApp sent to {to_number}: {result.get('sid')}")
                return {"status": "sent", "sid": result.get('sid')}
                
        except Exception as e:
            logger.error(f"WhatsApp error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    @classmethod
    def _format_number(cls, number: str) -> str:
        """Format number for WhatsApp"""
        # Remove spaces and dashes
        clean = ''.join(c for c in number if c.isdigit() or c == '+')
        
        # Add UAE code if not present
        if not clean.startswith('+'):
            if clean.startswith('0'):
                clean = '+971' + clean[1:]
            elif clean.startswith('971'):
                clean = '+' + clean
            else:
                clean = '+971' + clean
        
        return f"whatsapp:{clean}"
    
    @classmethod
    async def send_job_created(cls, mobile: str, job_number: str, customer_name: str) -> dict:
        """Send job created notification"""
        message = f"""🚗 *AutoCare Service Booking Confirmed*

Hello {customer_name}!

Your service booking has been confirmed.

📋 *Job Number:* {job_number}

We'll notify you of any updates. Track your vehicle status in the AutoCare app.

Thank you for choosing AutoCare!"""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_estimate_ready(
        cls, 
        mobile: str, 
        job_number: str, 
        customer_name: str,
        total_amount: float
    ) -> dict:
        """Send estimate approval request"""
        message = f"""📝 *Service Estimate Ready*

Hello {customer_name}!

Your vehicle diagnosis is complete.

📋 *Job:* {job_number}
💰 *Estimated Total:* AED {total_amount:.2f}

Please approve the estimate in your AutoCare app to proceed with repairs.

Questions? Reply to this message!"""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_parts_approval(
        cls,
        mobile: str,
        job_number: str,
        customer_name: str,
        parts_total: float
    ) -> dict:
        """Send parts approval request"""
        message = f"""🔧 *Parts Approval Required*

Hello {customer_name}!

We've sourced the best parts for your vehicle.

📋 *Job:* {job_number}
🔩 *Parts Total:* AED {parts_total:.2f}

Please approve in the AutoCare app to continue with the repair.

Reply APPROVE to confirm or check the app for details."""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_vehicle_ready(
        cls,
        mobile: str,
        job_number: str,
        customer_name: str,
        balance_due: float
    ) -> dict:
        """Send vehicle ready notification"""
        balance_text = f"💳 *Balance Due:* AED {balance_due:.2f}\n" if balance_due > 0 else "✅ Payment Complete\n"
        
        message = f"""🎉 *Your Vehicle is Ready!*

Hello {customer_name}!

Great news! Your vehicle service is complete.

📋 *Job:* {job_number}
{balance_text}
🚗 Ready for pickup or we can deliver!

Book delivery in the app or visit our center.

Thank you for choosing AutoCare! 🙏"""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_driver_enroute(
        cls,
        mobile: str,
        job_number: str,
        customer_name: str,
        driver_name: str,
        is_pickup: bool = True
    ) -> dict:
        """Send driver en route notification"""
        action = "pickup" if is_pickup else "delivery"
        
        message = f"""🚙 *Driver On The Way*

Hello {customer_name}!

Your driver is heading to you for vehicle {action}.

📋 *Job:* {job_number}
👤 *Driver:* {driver_name}

Track live location in the AutoCare app.

Questions? Reply here!"""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_payment_received(
        cls,
        mobile: str,
        job_number: str,
        customer_name: str,
        amount: float,
        payment_method: str
    ) -> dict:
        """Send payment confirmation"""
        message = f"""✅ *Payment Received*

Hello {customer_name}!

Thank you for your payment.

📋 *Job:* {job_number}
💰 *Amount:* AED {amount:.2f}
💳 *Method:* {payment_method.title()}

Receipt available in your AutoCare app.

Thank you for choosing AutoCare! 🙏"""
        
        return await cls.send_message(mobile, message)
    
    @classmethod
    async def send_feedback_request(
        cls,
        mobile: str,
        job_number: str,
        customer_name: str
    ) -> dict:
        """Send feedback request after service"""
        message = f"""⭐ *How Was Your Experience?*

Hello {customer_name}!

We hope you're enjoying your freshly serviced vehicle!

📋 *Job:* {job_number}

Your feedback helps us improve:
⭐⭐⭐⭐⭐ Rate us in the app!

Reply with a number 1-5 or share your thoughts.

Thank you! 🙏"""
        
        return await cls.send_message(mobile, message)
