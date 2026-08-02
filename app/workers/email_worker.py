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
        CRITICAL_EMAIL_EVENTS = {
            "new_user", "auth.verification", "auth.welcome", "auth.reset_password",
            "payment_success", "payment_failed", "payment", "payment.receipt",
            "payment.refund", "deposit.confirmed", "deposit.released"
        }
        event_type = event.get("event_type", "")
        if event_type not in CRITICAL_EMAIL_EVENTS:
            logger.info(f"Skipping email delivery for non-critical event type '{event_type}'")
            save_notification(event, "email", "skipped")
            c.commit(msg)
            continue

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
            
            # Create a beautiful HTML template
            payload_data = event.get('payload', {})
            message_text = payload_data.get('item', str(payload_data)) if isinstance(payload_data, dict) else str(payload_data)

            subject = f"Campus Resources: {event_type.replace('_', ' ').replace('.', ' ').title()}"
            title = "Critical Account Alert"

            if isinstance(payload_data, dict):
                if 'title' in payload_data:
                    title = payload_data['title']
                if 'message' in payload_data:
                    message_text = payload_data['message']

            if isinstance(payload_data, dict) and 'custom_template' in payload_data:
                custom = payload_data['custom_template']
                subject = custom.get('subject', subject)
                title = custom.get('title', title)
                message_text = custom.get('body', message_text)

            html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Top Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F4B3F 0%, #0D2820 100%); padding: 32px 28px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                <span style="color: #FFFFFF; font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">🤝 ShareNeighbour</span>
              </div>
              <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">{title}</h1>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 32px; color: #334155; font-size: 14px; line-height: 1.6;">
              <div style="background-color: #F8FAFC; border-left: 4px solid #10B981; padding: 18px 22px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
                <p style="margin: 0; color: #1E293B; font-size: 14px; font-weight: 500; line-height: 1.6;">{message_text}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #F1F5F9; text-align: center;">
              <p style="margin: 0; font-weight: 700; color: #475569; font-size: 13px;">Campus Resource Sharing System</p>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">Automated Critical Activity Notification</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

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