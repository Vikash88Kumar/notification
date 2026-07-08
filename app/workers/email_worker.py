# app/workers/email_worker.py
import resend
from confluent_kafka import Consumer, Producer
import json
from app.db import get_user_email
from app.redis_client import get_presence
from app.kafka_config import get_kafka_config

# TODO: Replace with your actual Resend API Key
resend.api_key = "re_WqXvAcAC_3sbX2zth4Ps6sZ7syMjFZ38w"

c = Consumer(get_kafka_config('email-worker'))
c.subscribe(['email.queue'])

retry_producer = Producer(get_kafka_config())

print("Email Worker started, waiting for messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
        
    event = json.loads(msg.value())
    user_id = event["user_id"]

    # Skip email if user is actively online in-app (avoid spam)
    if get_presence(user_id) == "online":
        print(f"User {user_id} is online. Skipping email.")
        c.commit(msg)
        continue

    email_address = get_user_email(user_id)
    if not email_address:
        print(f"No email found for user {user_id}, skipping.")
        c.commit(msg)
        continue

    try:
        # Send the email via Resend
        r = resend.Emails.send({
            "from": "onboarding@resend.dev", # Resend's default testing domain
            "to": email_address,
            "subject": "New Notification",
            "html": f"<p>{event.get('payload', '')}</p>"
        })
        print(f"Email sent to {email_address}!")
        
    except Exception as e:
        print(f"Resend error: {e}. Sending to retry queue.")
        retry_producer.produce(
            "notification.retry", 
            key=str(user_id),
            value=json.dumps({**event, "channel": "email", "error": str(e)})
        )
        retry_producer.flush()

    c.commit(msg)