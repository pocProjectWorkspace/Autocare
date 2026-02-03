"""
WebSocket Service - Real-time Updates
"""
import json
import logging
from typing import Dict, List, Set, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import dataclass, field
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class ConnectionInfo:
    """WebSocket connection information"""
    websocket: WebSocket
    user_id: str
    user_role: str
    branch_id: Optional[str] = None
    subscriptions: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Connections by user_id
        self._connections: Dict[str, ConnectionInfo] = {}
        # Group subscriptions: channel -> set of user_ids
        self._channels: Dict[str, Set[str]] = {}
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_role: str,
        branch_id: Optional[str] = None
    ) -> ConnectionInfo:
        """Accept new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            # Close existing connection for this user if any
            if user_id in self._connections:
                try:
                    await self._connections[user_id].websocket.close()
                except:
                    pass
            
            conn = ConnectionInfo(
                websocket=websocket,
                user_id=user_id,
                user_role=user_role,
                branch_id=branch_id
            )
            self._connections[user_id] = conn
            
            # Auto-subscribe to role-based channels
            await self._subscribe_to_channel(user_id, f"role:{user_role}")
            if branch_id:
                await self._subscribe_to_channel(user_id, f"branch:{branch_id}")
            
            logger.info(f"WebSocket connected: user={user_id}, role={user_role}")
            
            return conn
    
    async def disconnect(self, user_id: str):
        """Handle WebSocket disconnection"""
        async with self._lock:
            if user_id in self._connections:
                conn = self._connections[user_id]
                
                # Remove from all channels
                for channel in list(conn.subscriptions):
                    if channel in self._channels:
                        self._channels[channel].discard(user_id)
                        if not self._channels[channel]:
                            del self._channels[channel]
                
                del self._connections[user_id]
                logger.info(f"WebSocket disconnected: user={user_id}")
    
    async def _subscribe_to_channel(self, user_id: str, channel: str):
        """Subscribe user to a channel"""
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(user_id)
        
        if user_id in self._connections:
            self._connections[user_id].subscriptions.add(channel)
    
    async def subscribe(self, user_id: str, channels: List[str]):
        """Subscribe user to multiple channels"""
        async with self._lock:
            for channel in channels:
                await self._subscribe_to_channel(user_id, channel)
    
    async def unsubscribe(self, user_id: str, channels: List[str]):
        """Unsubscribe user from channels"""
        async with self._lock:
            if user_id in self._connections:
                for channel in channels:
                    self._connections[user_id].subscriptions.discard(channel)
                    if channel in self._channels:
                        self._channels[channel].discard(user_id)
    
    async def send_to_user(
        self,
        user_id: str,
        event_type: str,
        data: dict
    ) -> bool:
        """Send message to a specific user"""
        if user_id not in self._connections:
            return False
        
        try:
            message = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
            await self._connections[user_id].websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"Send to user failed: {user_id}, error: {str(e)}")
            await self.disconnect(user_id)
            return False
    
    async def broadcast_to_channel(
        self,
        channel: str,
        event_type: str,
        data: dict,
        exclude_user: Optional[str] = None
    ) -> int:
        """Broadcast message to all subscribers of a channel"""
        if channel not in self._channels:
            return 0
        
        sent = 0
        message = {
            "type": event_type,
            "channel": channel,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for user_id in list(self._channels[channel]):
            if user_id == exclude_user:
                continue
            if user_id in self._connections:
                try:
                    await self._connections[user_id].websocket.send_json(message)
                    sent += 1
                except Exception as e:
                    logger.error(f"Broadcast failed for user {user_id}: {str(e)}")
                    await self.disconnect(user_id)
        
        return sent
    
    async def broadcast_to_role(
        self,
        role: str,
        event_type: str,
        data: dict
    ) -> int:
        """Broadcast to all users with a specific role"""
        return await self.broadcast_to_channel(f"role:{role}", event_type, data)
    
    async def broadcast_to_branch(
        self,
        branch_id: str,
        event_type: str,
        data: dict
    ) -> int:
        """Broadcast to all users in a branch"""
        return await self.broadcast_to_channel(f"branch:{branch_id}", event_type, data)
    
    def get_connection_count(self) -> int:
        """Get total active connections"""
        return len(self._connections)
    
    def get_channel_subscribers(self, channel: str) -> int:
        """Get subscriber count for a channel"""
        return len(self._channels.get(channel, set()))


# Global connection manager
connection_manager = ConnectionManager()


# Event types
class EventTypes:
    # Job events
    JOB_CREATED = "job.created"
    JOB_STATUS_CHANGED = "job.status_changed"
    JOB_ASSIGNED = "job.assigned"
    
    # Estimate/Approval events
    ESTIMATE_READY = "estimate.ready"
    ESTIMATE_APPROVED = "estimate.approved"
    PARTS_APPROVAL_NEEDED = "parts.approval_needed"
    PARTS_APPROVED = "parts.approved"
    
    # Payment events
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_LINK_CREATED = "payment.link_created"
    
    # Driver/Tracking events
    DRIVER_LOCATION = "driver.location"
    DRIVER_ASSIGNED = "driver.assigned"
    PICKUP_STARTED = "pickup.started"
    VEHICLE_PICKED = "vehicle.picked"
    DELIVERY_STARTED = "delivery.started"
    VEHICLE_DELIVERED = "vehicle.delivered"
    
    # RFQ events
    RFQ_CREATED = "rfq.created"
    QUOTE_RECEIVED = "quote.received"
    QUOTE_SELECTED = "quote.selected"
    
    # Chat/Message events
    NEW_MESSAGE = "message.new"
    MESSAGE_READ = "message.read"
    
    # Notification
    NOTIFICATION = "notification"


# Helper functions for common broadcasts
async def notify_job_status_change(
    job_id: str,
    job_number: str,
    old_status: str,
    new_status: str,
    customer_id: str,
    branch_id: str
):
    """Notify all relevant parties about job status change"""
    data = {
        "job_id": job_id,
        "job_number": job_number,
        "old_status": old_status,
        "new_status": new_status
    }
    
    # Notify customer
    await connection_manager.send_to_user(customer_id, EventTypes.JOB_STATUS_CHANGED, data)
    
    # Notify branch staff
    await connection_manager.broadcast_to_branch(branch_id, EventTypes.JOB_STATUS_CHANGED, data)


async def notify_driver_location(
    driver_id: str,
    job_id: str,
    customer_id: str,
    latitude: float,
    longitude: float,
    heading: Optional[float] = None
):
    """Send driver location update to customer"""
    data = {
        "job_id": job_id,
        "driver_id": driver_id,
        "latitude": latitude,
        "longitude": longitude,
        "heading": heading,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await connection_manager.send_to_user(customer_id, EventTypes.DRIVER_LOCATION, data)


async def notify_new_rfq(branch_id: str, rfq_id: str, parts_count: int):
    """Notify vendors about new RFQ"""
    data = {
        "rfq_id": rfq_id,
        "parts_count": parts_count
    }
    
    await connection_manager.broadcast_to_role("vendor", EventTypes.RFQ_CREATED, data)
