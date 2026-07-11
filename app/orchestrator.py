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
    from .redis_client import get_presence
except ImportError:
    from db import get_pref
    from kafka_config import get_kafka_config
    from redis_client import get_presence

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
    event_type = event.get("event_type")
    
    logger.info(f"Received event '{event_type}' for User {user_id}. Routing...")

    target_channels = event.get("channels")

    # Step 1: Resolve base channels
    if target_channels is None:
        target_channels = []
        if get_pref(user_id, "push") != "disabled": 
            target_channels.append("push")
        if get_pref(user_id, "inapp") != "disabled": 
            target_channels.append("inapp")
        
        # Event-driven Email rule
        critical_events = ["new_user", "payment_success", "payment_failed", "payment"]
        if event_type in critical_events and get_pref(user_id, "email") != "disabled":
            target_channels.append("email")
    else:
        logger.info(f"Routing to specific channels overridden by payload: {target_channels}")

    # Step 2: Apply Smart Presence Filtering
    presence = get_presence(user_id)
    final_channels = set()

    if presence == "online":
        logger.info(f"User {user_id} is ONLINE. Applying online suppression.")
        if "inapp" in target_channels:
            final_channels.add("inapp")
        if "email" in target_channels:
            final_channels.add("email")
    else:
        logger.info(f"User {user_id} is OFFLINE. Routing to all preferred channels.")
        if "push" in target_channels:
            final_channels.add("push")
        if "email" in target_channels:
            final_channels.add("email")
        if "inapp" in target_channels:
            final_channels.add("inapp")

    # Step 3: Dispatch to Kafka
    logger.info(f"Final resolved channels: {list(final_channels)}")
    for ch in final_channels:
        producer.produce(f"{ch}.queue", value=json.dumps(event))

    producer.flush()
    c.commit(msg)