# app/workers/dlq_worker.py
import json
from confluent_kafka import Consumer
from app.kafka_config import get_kafka_config

c = Consumer(get_kafka_config('dlq-worker'))
c.subscribe(['notification.dlq'])

print("DLQ Worker started, monitoring for permanent failures...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    event = json.loads(msg.value())
    print(f"🚨 [DLQ ALERT] Message permanently failed for User {event.get('user_id')}")
    print(f"Channel: {event.get('channel')} | Error: {event.get('error')}")
    
    c.commit(msg)