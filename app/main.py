import uuid
from fastapi import FastAPI, WebSocket
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
import os
import firebase_admin
from firebase_admin import credentials

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
    allow_origins=["http://localhost:5173"], # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/health")
def health_check():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "error", "database": "disconnected", "detail": str(exc)}

@app.post("/users/{user_id}/token")
async def update_token(user_id: int, data: dict):
    from app.db import update_user_token
    token = data.get("fcm_token")
    if not token:
        return {"error": "Missing fcm_token"}, 400
    
    success = update_user_token(user_id, token)
    if success:
        return {"status": "success"}
    return {"error": "User not found"}, 404

@app.post("/events")
def create_event(user_id: int, event_type: str, payload: dict):
    event = {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "event_type": event_type,
        "payload": payload,
    }
    publish("notification.events", key=str(user_id), value=event)
    return {"status": "queued", "event_id": event["event_id"]}


active_connections: dict[int, WebSocket] = {}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    active_connections[user_id] = websocket
    set_presence(user_id, "online", ttl=60)
    try:
        while True:
            await websocket.receive_text()
            set_presence(user_id, "online", ttl=60)
    except Exception:
        del active_connections[user_id]
        clear_presence(user_id)