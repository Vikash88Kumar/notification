# app/orchestrator.py
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from confluent_kafka import Consumer, Producer

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
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

    event = json.loads(msg.value())
    user_id = event.get("user_id")
    
    logger.info(f"Received event for User {user_id}. Routing...")

    # 1. ALWAYS send to In-App (the database)
    producer.produce("inapp.queue", value=json.dumps(event))
    
    # 2. Check DB preferences before sending to Push
    if get_pref(user_id, "push") != "disabled":
        producer.produce("push.queue", value=json.dumps(event))
        
    # 3. Check DB preferences before sending to Email
    if get_pref(user_id, "email") != "disabled":
        producer.produce("email.queue", value=json.dumps(event))

    producer.flush()
    c.commit(msg)