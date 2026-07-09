# app/workers/email_worker.py
import resend
from confluent_kafka import Consumer, Producer
import json
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"  # d:/notification/.env
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Resend API Key from environment variable
resend.api_key = os.getenv("RESEND_API_KEY")
if not resend.api_key:
    logger.warning("⚠️ RESEND_API_KEY not set in environment variables. Email service will not work!")
    raise ValueError("RESEND_API_KEY environment variable is required")

try:
    from app.db import get_user_email, save_notification
    from app.redis_client import get_presence
    from app.kafka_config import get_kafka_config
except ImportError:
    from db import get_user_email, save_notification
    from redis_client import get_presence
    from kafka_config import get_kafka_config

c = Consumer(get_kafka_config('email-worker'))
c.subscribe(['email.queue'])

retry_producer = Producer(get_kafka_config())

logger.info("✉️ Email Worker started, waiting for messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    
    try:
        event = json.loads(msg.value())
        user_id = event["user_id"]

        # Skip email if user is actively online in-app (avoid spam)
        if get_presence(user_id) == "online":
            logger.info(f"User {user_id} is online. Skipping email.")
            save_notification(event, "email", "skipped")
            c.commit(msg)
            continue

        email_address = get_user_email(user_id)
        if not email_address:
            logger.warning(f"No email found for user {user_id}, skipping.")
            save_notification(event, "email", "skipped")
            c.commit(msg)
            continue

        try:
            # Validate email format
            if "@" not in email_address or "." not in email_address.split("@")[1]:
                raise ValueError(f"Invalid email format: {email_address}")
            
            # Send the email via Resend
            r = resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": email_address,
                "subject": event.get("event_type", "New Notification"),
                "html": f"<p>{event.get('payload', '')}</p>"
            })
            logger.info(f"✅ Email sent to {email_address}!")
            save_notification(event, "email", "sent")
            
        except Exception as e:
            logger.error(f"❌ Resend error: {e}. Sending to retry queue.")
            retry_producer.produce(
                "notification.retry", 
                key=str(user_id),
                value=json.dumps({**event, "channel": "email", "error": str(e)})
            )
            retry_producer.flush()
            save_notification(event, "email", "failed")

        c.commit(msg)
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse message: {e}")
        c.commit(msg)