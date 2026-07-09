# app/workers/dlq_worker.py
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from confluent_kafka import Consumer

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env" 
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app.kafka_config import get_kafka_config
except ImportError:
    from kafka_config import get_kafka_config

c = Consumer(get_kafka_config('dlq-worker'))
c.subscribe(['notification.dlq'])

logger.warning("🚨 DLQ Worker started, monitoring for permanent failures...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    event = json.loads(msg.value())
    logger.error(f"🚨 [DLQ ALERT] Message permanently failed for User {event.get('user_id')}")
    logger.error(f"Channel: {event.get('channel')} | Error: {event.get('error')}")
    
    c.commit(msg)