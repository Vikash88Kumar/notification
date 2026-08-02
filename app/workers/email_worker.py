# app/workers/email_worker.py
import resend
from confluent_kafka import Consumer, Producer
import json
import os
import logging
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"  # d:/notification/.env
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Brevo and Resend API Keys from environment
brevo_api_key = os.getenv("BREVO_API_KEY")
brevo_sender_email = os.getenv("BREVO_SENDER_EMAIL", "resourcesharing67@gmail.com")
brevo_sender_name = os.getenv("BREVO_SENDER_NAME", "Campus Resources")

resend_api_key = os.getenv("RESEND_API_KEY")
if resend_api_key:
    resend.api_key = resend_api_key

if not brevo_api_key and not resend_api_key:
    logger.warning("⚠️ Neither BREVO_API_KEY nor RESEND_API_KEY is configured in .env!")

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
        user_id = event.get("user_id")

        # 1. Check if presence was provided directly in the payload (Stateless SaaS)
        presence = event.get("presence")
        if not presence:
            presence = get_presence(user_id)
            
        force_delivery = event.get("force_delivery", False)
        if presence == "online" and not force_delivery:
            logger.info(f"User {user_id} is online. Skipping email.")
            save_notification(event, "email", "skipped")
            c.commit(msg)
            continue
        
        # 1. Check if email was provided directly in the payload (Stateless SaaS)
        email = event.get("contact_info", {}).get("email")
        if not email:
            # 2. Fallback to querying our own database
            email = get_user_email(user_id)
            
        if not email:
            logger.error(f"No email found for User {user_id}. Skipping.")
            save_notification(event, "email", "skipped")
            c.commit(msg)
            continue

        try:
            # Validate email format
            if "@" not in email or "." not in email.split("@")[1]:
                raise ValueError(f"Invalid email format: {email}")
            
            # Create a beautiful Shareit HTML template
            payload_data = event.get('payload', {})
            # If payload is a dict with 'item', extract it, otherwise use as string
            message_text = payload_data.get('item', str(payload_data)) if isinstance(payload_data, dict) else str(payload_data)

            event_type = event.get('event_type', 'Notification')
            subject = f"Shareit Update: {event_type}"
            title = "You have a new update"

            # Customisable format overrides
            if isinstance(payload_data, dict) and 'custom_template' in payload_data:
                custom = payload_data['custom_template']
                subject = custom.get('subject', subject)
                title = custom.get('title', title)
                message_text = custom.get('body', message_text)
            else:
                # Fixed formats for friends
                if event_type == 'friend_request':
                    subject = "New Friend Request on Shareit!"
                    title = "Someone wants to connect"
                    sender = payload_data.get('sender_name', 'Someone')
                    message_text = f"<b>{sender}</b> has sent you a friend request. Log in to accept or decline."
                elif event_type == 'friend_accepted':
                    subject = "Friend Request Accepted!"
                    title = "You have a new friend"
                    friend = payload_data.get('friend_name', 'A user')
                    message_text = f"<b>{friend}</b> has accepted your friend request. Say hi!"
                elif event_type == 'friend_message':
                    subject = "New Message from a Friend"
                    title = "You have a new message"
                    sender = payload_data.get('sender_name', 'A friend')
                    # We assume message_text has the actual message text here
                    message_text = f"<b>{sender}</b> sent you a message:<br><br><i>{message_text}</i>"

            html_content = f"""
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">Shareit</h1>
                </div>
                <div style="padding: 40px 30px; background-color: #ffffff; color: #334155;">
                    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">{title}</h2>
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

            # Send email via Brevo API or Resend fallback
            if brevo_api_key:
                url = "https://api.brevo.com/v3/smtp/email"
                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": brevo_api_key.strip(),
                }
                payload = {
                    "sender": {
                        "name": brevo_sender_name,
                        "email": brevo_sender_email,
                    },
                    "to": [{"email": email}],
                    "subject": subject,
                    "htmlContent": html_content,
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = response.read().decode("utf-8")
                    logger.info(f"✅ Email sent via Brevo to {email}! Response: {res_body}")
            elif resend_api_key:
                r = resend.Emails.send({
                    "from": f"{brevo_sender_name} <onboarding@resend.dev>",
                    "to": email,
                    "subject": subject,
                    "html": html_content
                })
                logger.info(f"✅ Email sent via Resend to {email}!")
            else:
                raise ValueError("No valid email API key (BREVO_API_KEY or RESEND_API_KEY) found.")

            save_notification(event, "email", "sent")
            
        except Exception as e:
            logger.error(f"❌ Email dispatch error: {e}. Sending to retry queue.")
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