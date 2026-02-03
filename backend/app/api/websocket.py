"""
WebSocket API Endpoints
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import json
import logging

from app.core.deps import get_db
from app.core.security import decode_token
from app.models import User
from app.services.websocket_service import connection_manager, EventTypes

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time updates
    
    Connect with: ws://host/api/ws?token=<jwt_token>
    
    Incoming message format:
    {
        "action": "subscribe" | "unsubscribe" | "ping",
        "channels": ["job:123", "branch:456"]  // for subscribe/unsubscribe
    }
    
    Outgoing message format:
    {
        "type": "event_type",
        "channel": "channel_name",  // optional
        "data": { ... },
        "timestamp": "2026-02-01T10:00:00Z"
    }
    """
    # Verify token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
            
    except Exception as e:
        logger.error(f"WebSocket auth error: {str(e)}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    # Connect
    conn = await connection_manager.connect(
        websocket=websocket,
        user_id=str(user.id),
        user_role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None
    )
    
    # Auto-subscribe to user's job updates
    await connection_manager.subscribe(str(user.id), [f"user:{user.id}"])
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "data": {
                "user_id": str(user.id),
                "role": user.role,
                "subscriptions": list(conn.subscriptions)
            }
        })
        
        # Listen for messages
        while True:
            message = await websocket.receive_text()
            
            try:
                data = json.loads(message)
                action = data.get("action")
                
                if action == "ping":
                    await websocket.send_json({"type": "pong"})
                
                elif action == "subscribe":
                    channels = data.get("channels", [])
                    # Validate channel access
                    allowed_channels = []
                    for channel in channels:
                        if channel.startswith("job:"):
                            # User can subscribe to their own jobs
                            allowed_channels.append(channel)
                        elif channel.startswith("branch:") and user.role in ["admin", "service_advisor", "technician"]:
                            allowed_channels.append(channel)
                    
                    await connection_manager.subscribe(str(user.id), allowed_channels)
                    await websocket.send_json({
                        "type": "subscribed",
                        "data": {"channels": allowed_channels}
                    })
                
                elif action == "unsubscribe":
                    channels = data.get("channels", [])
                    await connection_manager.unsubscribe(str(user.id), channels)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "data": {"channels": channels}
                    })
                
                elif action == "driver_location" and user.role == "driver":
                    # Driver sending location update
                    job_id = data.get("job_id")
                    latitude = data.get("latitude")
                    longitude = data.get("longitude")
                    
                    if job_id and latitude and longitude:
                        # Broadcast to job subscribers
                        await connection_manager.broadcast_to_channel(
                            f"job:{job_id}",
                            EventTypes.DRIVER_LOCATION,
                            {
                                "driver_id": str(user.id),
                                "latitude": latitude,
                                "longitude": longitude,
                                "heading": data.get("heading")
                            },
                            exclude_user=str(user.id)
                        )
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Invalid JSON"}
                })
            except Exception as e:
                logger.error(f"WebSocket message error: {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "Processing error"}
                })
    
    except WebSocketDisconnect:
        await connection_manager.disconnect(str(user.id))
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await connection_manager.disconnect(str(user.id))


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "active_connections": connection_manager.get_connection_count()
    }
