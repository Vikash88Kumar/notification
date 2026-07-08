import firebase_admin
from firebase_admin import credentials, messaging
from confluent_kafka import Consumer, Producer
import json
from app.db import get_fcm_token
from app.redis_client import get_presence # Now this will work!
from app.kafka_config import get_kafka_config

firebase_admin.initialize_app(credentials.Certificate("firebase-key.json"))

c = Consumer(get_kafka_config('push-worker'))
c.subscribe(['push.queue'])

retry_producer = Producer(get_kafka_config())

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    user_id = event["user_id"]

    # Skip push if user is actively online in-app (avoid duplicate ping)
    if get_presence(user_id) == "online":
        print(f"User {user_id} is online. Skipping push notification.")
        c.commit(msg)
        continue

    token = get_fcm_token(user_id)
    if not token:
        c.commit(msg)
        continue

    try:
        messaging.send(messaging.Message(
            notification=messaging.Notification(
                title="New notification",
                body=str(event["payload"])
            ),
            token=token
        ))
        print(f"Push sent to user {user_id}!")
    except Exception as e:
        retry_producer.produce("notification.retry", key=str(user_id),
                                value=json.dumps({**event, "channel": "push", "error": str(e)}))
        retry_producer.flush()
    c.commit(msg)