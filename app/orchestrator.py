# app/orchestrator.py
import json
from confluent_kafka import Consumer, Producer
from app.db import get_pref

c = Consumer({
    'bootstrap.servers': '127.0.0.1:9092',
    'group.id': 'orchestrator-group',
    'auto.offset.reset': 'earliest'
})
c.subscribe(['notification.events'])

producer = Producer({'bootstrap.servers': '127.0.0.1:9092'})

print("🚦 Orchestrator started, routing traffic...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    event = json.loads(msg.value())
    user_id = event.get("user_id")
    
    print(f"Received event for User {user_id}. Routing...")

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