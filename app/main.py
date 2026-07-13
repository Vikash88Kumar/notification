import uuid
import asyncio
import json
from fastapi import FastAPI, WebSocket
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
import os
import firebase_admin
from firebase_admin import credentials
import redis.asyncio as aioredis

redis_client = aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)


secret_file_path = "/etc/secrets/Firebase-key"

if os.path.exists(secret_file_path):
    # Use the file mounted by Render
    cred = credentials.Certificate(secret_file_path)
else:
    # Fallback to local file for development
    cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(cred)

try:
    from .db import SessionLocal, init_db
    from .producer import publish
    from .redis_client import clear_presence, set_presence
except ImportError:
    from db import SessionLocal, init_db
    from producer import publish
    from redis_client import clear_presence, set_presence

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://notification-microservice-1jx2.onrender.com", "*"], # Added deployed frontend and wildcard
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging
logger = logging.getLogger(__name__)

async def redis_listener():
    try:
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("notifications:pubsub")
        logger.info("✅ Started Redis Pub/Sub listener for WebSockets")
        async for message in pubsub.listen():
            logger.info(f"📥 Redis Pub/Sub message received: {message}")
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    user_id = data.get("user_id")
                    logger.info(f"🔍 Processing notification for user: {user_id}")
                    if user_id:
                        ws = active_connections.get(str(user_id))
                        if ws:
                            logger.info(f"⚡ Delivering WebSocket message to {user_id}")
                            await ws.send_json(data)
                        else:
                            # In a multi-instance setup, it's normal for a connection to not be found on *this* instance
                            logger.debug(f"ℹ️ WebSocket not present on this instance for user {user_id}")
                except Exception as e:
                    logger.error(f"❌ Error processing pubsub message: {e}")
    except Exception as e:
        logger.error(f"🚨 Redis listener crashed: {e}")

# Keep a strong reference to background tasks to prevent garbage collection
background_tasks = set()

@app.on_event("startup")
async def startup_event() -> None:
    init_db()
    task = asyncio.create_task(redis_listener())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)


@app.get("/health")
def health_check():
    status = {"status": "ok", "components": {}}
    
    # 1. Check Database
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        status["components"]["database"] = "connected"
    except Exception as exc:
        status["components"]["database"] = f"disconnected ({str(exc)})"
        status["status"] = "error"
        
    # 2. Check Redis
    try:
        from .redis_client import redis_client
        # Simple ping by setting and getting a dummy key
        redis_client.set("health_check_ping", "pong", ex=5)
        if redis_client.get("health_check_ping") == "pong":
            status["components"]["redis"] = "connected"
        else:
            status["components"]["redis"] = "disconnected (ping failed)"
            status["status"] = "error"
    except Exception as exc:
        status["components"]["redis"] = f"disconnected ({str(exc)})"
        status["status"] = "error"
        
    # 3. Check Kafka
    try:
        from .producer import p
        # Attempt to list topics (timeout after 2s) to check broker connectivity
        topics = p.list_topics(timeout=2.0)
        if topics:
            status["components"]["kafka"] = "connected"
        else:
            status["components"]["kafka"] = "disconnected (timeout)"
            status["status"] = "error"
    except Exception as exc:
        status["components"]["kafka"] = f"disconnected ({str(exc)})"
        status["status"] = "error"

    return status

@app.post("/users/{user_id}/token")
async def update_token(user_id: str, data: dict):
    from fastapi import HTTPException
    try:
        from .db import update_user_token
    except ImportError:
        from db import update_user_token
    token = data.get("fcm_token")
    email = data.get("email")  # Optional: include email if provided
    if not token:
        raise HTTPException(status_code=400, detail="Missing fcm_token")
    
    success = update_user_token(user_id, token, email)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/users/{user_id}/presence")
async def set_user_presence(user_id: str):
    """Manually set a user as 'online' in Redis for 5 minutes."""
    set_presence(user_id, "online", ttl=300)
    return {"status": "success", "presence": "online"}

@app.delete("/users/{user_id}/presence")
async def clear_user_presence(user_id: str):
    """Manually mark a user as 'offline' in Redis."""
    clear_presence(user_id)
    return {"status": "success", "presence": "offline"}

@app.get("/users/{user_id}/preferences")
async def get_user_preferences(user_id: str):
    from fastapi import HTTPException
    try:
        from .db import get_user_prefs
    except ImportError:
        from db import get_user_prefs
    
    prefs = get_user_prefs(user_id)
    return {"user_id": user_id, "preferences": prefs}

@app.put("/users/{user_id}/preferences")
async def update_user_preferences(user_id: str, data: dict):
    from fastapi import HTTPException
    try:
        from .db import set_pref
    except ImportError:
        from db import set_pref
    
    preferences = data.get("preferences", {})
    if not isinstance(preferences, dict):
        raise HTTPException(status_code=400, detail="preferences must be an object")
        
    for channel, pref_val in preferences.items():
        success = set_pref(user_id, channel, pref_val)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to save preference for {channel}")
            
    return {"status": "success", "user_id": user_id}

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ContactInfo(BaseModel):
    email: Optional[str] = None
    fcm_token: Optional[str] = None

class EventPayload(BaseModel):
    user_id: str
    event_type: str
    payload: Dict[str, Any]
    channels: Optional[List[str]] = None
    contact_info: Optional[ContactInfo] = None
    presence: Optional[str] = None
    force_delivery: Optional[bool] = False

from fastapi import Security, Depends
from fastapi.security import APIKeyHeader

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    expected_api_key = os.getenv("API_KEY", "default-dev-key")
    if api_key != expected_api_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Could not validate API Key")
    return api_key

@app.post("/events")
def create_event(event_req: EventPayload, api_key: str = Depends(get_api_key)):
    from fastapi import HTTPException
    event = {
        "event_id": str(uuid.uuid4()),
        "user_id": event_req.user_id,
        "event_type": event_req.event_type,
        "payload": event_req.payload,
        "force_delivery": event_req.force_delivery,
    }
    
    if event_req.channels is not None:
        event["channels"] = event_req.channels
    if event_req.contact_info is not None:
        event["contact_info"] = event_req.contact_info.model_dump()
    if event_req.presence is not None:
        event["presence"] = event_req.presence

    try:
        publish("notification.events", key=str(event_req.user_id), value=event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    return {"status": "queued", "event_id": event["event_id"]}


active_connections: dict[str, WebSocket] = {}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    active_connections[user_id] = websocket
    set_presence(user_id, "online", ttl=60)
    try:
        while True:
            await websocket.receive_text()
            set_presence(user_id, "online", ttl=60)
    except Exception:
        active_connections.pop(user_id, None)
        clear_presence(user_id)

# Removed /internal/broadcast since we use Redis Pub/Sub now

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)