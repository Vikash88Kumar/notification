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
            
            # Create a beautiful Shareit HTML template
            payload_data = event.get('payload', {})
            # If payload is a dict with 'item', extract it, otherwise use as string
            message_text = payload_data.get('item', str(payload_data)) if isinstance(payload_data, dict) else str(payload_data)

            html_content = f"""
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">Shareit</h1>
                </div>
                <div style="padding: 40px 30px; background-color: #ffffff; color: #334155;">
                    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">You have a new update</h2>
                    <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #334155;">{message_text}</p>
                    </div>
                    <a href="https://notification-olgf.onrender.com" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Dashboard</a>
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 13px;">
                        <p style="margin: 0;">This is an automated message from Shareit.</p>
                        <p style="margin: 5px 0 0 0;">© 2026 Shareit Inc. All rights reserved.</p>
                    </div>
                </div>
            </div>
            """

            # Send the email via Resend
            r = resend.Emails.send({
                "from": "Shareit <onboarding@resend.dev>",
                "to": email_address,
                "subject": f"Shareit Update: {event.get('event_type', 'Notification')}",
                "html": html_content
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