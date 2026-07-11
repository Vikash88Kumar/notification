# workers/inapp_worker.py
from confluent_kafka import Consumer
import json, uuid
import logging
from pathlib import Path
from dotenv import load_dotenv
import requests
import os

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env" 
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app.db import save_notification
    from app.kafka_config import get_kafka_config
except ImportError:
    from db import save_notification
    from kafka_config import get_kafka_config

c = Consumer(get_kafka_config('inapp-worker'))
c.subscribe(['inapp.queue'])

logger.info("📱 In-App Worker started, waiting for messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    save_notification(event, channel="inapp", status="sent")
    logger.debug(f"Saved in-app notification for user {event.get('user_id')}")
    
    # Broadcast to live websocket via internal bridge
    try:
        port = os.environ.get('PORT', 8000)
        requests.post(
            f"http://localhost:{port}/internal/broadcast/{event.get('user_id')}",
            json=event,
            timeout=2
        )
        logger.info(f"Broadcasted to live websocket for user {event.get('user_id')}")
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed (user might be on another node or offline): {e}")

    c.commit(msg)