# app/workers/retry_worker.py
import time
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from confluent_kafka import Consumer, Producer

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app.kafka_config import get_kafka_config
except ImportError:
    from kafka_config import get_kafka_config

c = Consumer(get_kafka_config('retry-worker'))
c.subscribe(['notification.retry'])

producer = Producer(get_kafka_config())

logger.info("🔄 Retry Worker started, waiting for failed messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    event = json.loads(msg.value())
    attempt = event.get("retry_count", 0) + 1
    channel = event.get("channel")

    if attempt <= 3:
        logger.info(f"🔄 Retrying {channel} for user {event.get('user_id')} (Attempt {attempt}/3)...")
        time.sleep(5)  # Simple 5-second backoff
        
        event["retry_count"] = attempt
        # Send it back to its original queue to try again
        producer.produce(f"{channel}.queue", value=json.dumps(event))
    else:
        logger.error(f"❌ Max retries reached for user {event.get('user_id')}. Sending to DLQ.")
        # Failed 3 times? Send to Dead Letter Queue
        producer.produce("notification.dlq", value=json.dumps(event))
    
    producer.flush()
    c.commit(msg)