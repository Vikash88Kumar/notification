# app/orchestrator.py
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from confluent_kafka import Consumer, Producer

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from .db import get_pref
    from .kafka_config import get_kafka_config
except ImportError:
    from db import get_pref
    from kafka_config import get_kafka_config

c = Consumer(get_kafka_config('orchestrator-group'))
c.subscribe(['notification.events'])

producer = Producer(get_kafka_config())

logger.info("🚦 Orchestrator started, routing traffic...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    try:
        event = json.loads(msg.value())
    except Exception as e:
        logger.error(f"⚠️ Skipping malformed message: {msg.value()} - Error: {e}")
        c.commit(msg)
        continue
    user_id = event.get("user_id")
    
    logger.info(f"Received event for User {user_id}. Routing...")

    # Route event based on payload override or database preferences
    target_channels = event.get("channels")
    if target_channels is not None:
        logger.info(f"Routing to specific channels overridden by payload: {target_channels}")
        for ch in target_channels:
            producer.produce(f"{ch}.queue", value=json.dumps(event))
    else:
        # Fallback to database preferences
        if get_pref(user_id, "email") != "disabled":
            producer.produce("email.queue", value=json.dumps(event))
        if get_pref(user_id, "push") != "disabled":
            producer.produce("push.queue", value=json.dumps(event))
        if get_pref(user_id, "inapp") != "disabled":
            producer.produce("inapp.queue", value=json.dumps(event))

    producer.flush()
    c.commit(msg)