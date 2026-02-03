"""
Push Notification Service - Firebase Cloud Messaging
"""
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
from google.oauth2 import service_account
from google.auth.transport.requests import Request

from app.core.config import settings

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Firebase Cloud Messaging integration for push notifications"""
    
    FCM_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
    
    def __init__(self):
        self._credentials = None
        self._project_id = None
        self._initialize_credentials()
    
    def _initialize_credentials(self):
        """Initialize Firebase credentials"""
        if settings.FIREBASE_CREDENTIALS_PATH:
            try:
                self._credentials = service_account.Credentials.from_service_account_file(
                    settings.FIREBASE_CREDENTIALS_PATH,
                    scopes=self.SCOPES
                )
                with open(settings.FIREBASE_CREDENTIALS_PATH) as f:
                    creds_data = json.load(f)
                    self._project_id = creds_data.get("project_id")
                logger.info(f"FCM initialized for project: {self._project_id}")
            except Exception as e:
                logger.warning(f"FCM initialization failed: {str(e)}")
    
    def _get_access_token(self) -> str:
        """Get fresh access token for FCM"""
        if not self._credentials:
            raise ValueError("Firebase credentials not configured")
        
        if self._credentials.expired or not self._credentials.valid:
            self._credentials.refresh(Request())
        
        return self._credentials.token
    
    async def send_notification(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None,
        badge: Optional[int] = None,
        sound: str = "default",
        channel_id: str = "autocare_notifications"
    ) -> Dict[str, Any]:
        """
        Send push notification to a single device
        
        Args:
            device_token: FCM device registration token
            title: Notification title
            body: Notification body text
            data: Custom data payload
            image_url: Image to display
            badge: iOS badge count
            sound: Notification sound
            channel_id: Android notification channel
            
        Returns:
            FCM response with message ID
        """
        if not self._project_id:
            logger.warning("FCM not configured, skipping push notification")
            return {"status": "skipped", "reason": "not_configured"}
        
        try:
            access_token = self._get_access_token()
            
            message = {
                "message": {
                    "token": device_token,
                    "notification": {
                        "title": title,
                        "body": body,
                    },
                    "android": {
                        "notification": {
                            "channel_id": channel_id,
                            "sound": sound,
                            "default_sound": True,
                            "default_vibrate_timings": True,
                            "default_light_settings": True,
                        }
                    },
                    "apns": {
                        "payload": {
                            "aps": {
                                "sound": sound,
                                "badge": badge,
                            }
                        }
                    }
                }
            }
            
            if image_url:
                message["message"]["notification"]["image"] = image_url
            
            if data:
                message["message"]["data"] = {k: str(v) for k, v in data.items()}
            
            url = self.FCM_URL.format(project_id=self._project_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=message,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"FCM notification sent: {result.get('name')}")
                    return {"status": "sent", "message_id": result.get("name")}
                else:
                    logger.error(f"FCM error: {response.text}")
                    return {"status": "error", "error": response.text}
                    
        except Exception as e:
            logger.error(f"FCM send error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def send_multicast(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Send notification to multiple devices"""
        results = []
        success = 0
        failure = 0
        
        for token in device_tokens:
            result = await self.send_notification(
                device_token=token,
                title=title,
                body=body,
                data=data
            )
            results.append(result)
            if result.get("status") == "sent":
                success += 1
            else:
                failure += 1
        
        return {
            "success_count": success,
            "failure_count": failure,
            "results": results
        }
    
    async def send_topic_notification(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Send notification to a topic"""
        if not self._project_id:
            return {"status": "skipped", "reason": "not_configured"}
        
        try:
            access_token = self._get_access_token()
            
            message = {
                "message": {
                    "topic": topic,
                    "notification": {
                        "title": title,
                        "body": body,
                    },
                    "data": {k: str(v) for k, v in (data or {}).items()}
                }
            }
            
            url = self.FCM_URL.format(project_id=self._project_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=message,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    return {"status": "sent", "message_id": response.json().get("name")}
                else:
                    return {"status": "error", "error": response.text}
                    
        except Exception as e:
            logger.error(f"FCM topic error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def subscribe_to_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict[str, Any]:
        """Subscribe devices to a topic"""
        if not self._project_id:
            return {"status": "skipped"}
        
        try:
            access_token = self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://iid.googleapis.com/iid/v1:batchAdd",
                    json={
                        "to": f"/topics/{topic}",
                        "registration_tokens": device_tokens
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                return {"status": "success" if response.status_code == 200 else "error"}
        except Exception as e:
            return {"status": "error", "error": str(e)}


# Singleton instance
push_service = PushNotificationService()


# Helper functions for common notifications
async def notify_job_update(user_tokens: List[str], job_number: str, status: str, message: str):
    """Send job status update notification"""
    return await push_service.send_multicast(
        device_tokens=user_tokens,
        title=f"Job {job_number} Update",
        body=message,
        data={
            "type": "job_update",
            "job_number": job_number,
            "status": status
        }
    )


async def notify_driver_assignment(driver_token: str, job_number: str, address: str, is_pickup: bool):
    """Notify driver of new assignment"""
    action = "Pickup" if is_pickup else "Delivery"
    return await push_service.send_notification(
        device_token=driver_token,
        title=f"New {action} Assignment",
        body=f"Job {job_number}: {address}",
        data={
            "type": "driver_assignment",
            "job_number": job_number,
            "is_pickup": str(is_pickup).lower()
        }
    )


async def notify_payment_received(customer_token: str, job_number: str, amount: float):
    """Notify customer of payment received"""
    return await push_service.send_notification(
        device_token=customer_token,
        title="Payment Received",
        body=f"AED {amount:.2f} received for Job {job_number}",
        data={
            "type": "payment_received",
            "job_number": job_number,
            "amount": str(amount)
        }
    )


async def notify_approval_required(customer_token: str, job_number: str, approval_type: str):
    """Notify customer that approval is required"""
    return await push_service.send_notification(
        device_token=customer_token,
        title=f"{approval_type.title()} Approval Required",
        body=f"Please review and approve for Job {job_number}",
        data={
            "type": "approval_required",
            "job_number": job_number,
            "approval_type": approval_type
        }
    )
