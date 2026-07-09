import firebase_admin
from firebase_admin import credentials, messaging
from confluent_kafka import Consumer, Producer
import json
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env" 
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app.db import get_fcm_token
    from app.redis_client import get_presence
    from app.kafka_config import get_kafka_config
except ImportError:
    from db import get_fcm_token
    from redis_client import get_presence
    from kafka_config import get_kafka_config

secret_file_path = "/etc/secrets/Firebase-key"

if os.path.exists(secret_file_path):
    cred = credentials.Certificate(secret_file_path)
else:
    cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(cred)

c = Consumer(get_kafka_config('push-worker'))
c.subscribe(['push.queue'])

retry_producer = Producer(get_kafka_config())

logger.info("📱 Push Worker started, waiting for messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    user_id = event["user_id"]

    # Skip push if user is actively online in-app (avoid duplicate ping)
    # 1. Check if presence was provided directly in the payload (Stateless SaaS)
    presence = event.get("presence")
    if not presence:
        presence = get_presence(user_id)
        
    force_delivery = event.get("force_delivery", False)
    if presence == "online" and not force_delivery:
        logger.info(f"User {user_id} is online. Skipping push notification.")
        c.commit(msg)
        continue

    # 1. Check if token was provided directly in the payload (Stateless SaaS)
    token = event.get("contact_info", {}).get("fcm_token")
    if not token:
        # 2. Fallback to querying our own database
        token = get_fcm_token(user_id)

    if not token:
        logger.warning(f"No FCM token for user {user_id}, skipping.")
        c.commit(msg)
        continue

    try:
        payload_data = event.get('payload', {})
        message_text = payload_data.get('item', str(payload_data)) if isinstance(payload_data, dict) else str(payload_data)
        event_type = event.get('event_type', 'Notification')
        
        title = "New notification"
        body = message_text
        
        if isinstance(payload_data, dict) and 'custom_template' in payload_data:
            custom = payload_data['custom_template']
            title = custom.get('title', title)
            body = custom.get('body', body)
        else:
            if event_type == 'friend_request':
                title = "New Friend Request!"
                sender = payload_data.get('sender_name', 'Someone')
                body = f"{sender} wants to connect with you."
            elif event_type == 'friend_accepted':
                title = "Friend Request Accepted!"
                friend = payload_data.get('friend_name', 'A user')
                body = f"{friend} is now your friend."
            elif event_type == 'friend_message':
                title = "New Message"
                sender = payload_data.get('sender_name', 'A friend')
                body = f"{sender}: {message_text}"

        messaging.send(messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            token=token
        ))
        logger.info(f"✅ Push sent to user {user_id}!")
    except Exception as e:
        logger.error(f"❌ Push error: {e}. Sending to retry queue.")
        retry_producer.produce("notification.retry", key=str(user_id),
                                value=json.dumps({**event, "channel": "push", "error": str(e)}))
        retry_producer.flush()
    c.commit(msg)