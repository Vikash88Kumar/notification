# workers/inapp_worker.py
from confluent_kafka import Consumer
import json, uuid
from app.db import save_notification  # insert into notifications table
from app.kafka_config import get_kafka_config

c = Consumer(get_kafka_config('inapp-worker'))
c.subscribe(['inapp.queue'])

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    save_notification(event, channel="inapp", status="sent")
    # if user connected via WebSocket, push live; else it'll show as unread on next fetch
    c.commit(msg)