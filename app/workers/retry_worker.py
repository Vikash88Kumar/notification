# app/workers/retry_worker.py
import time
import json
from confluent_kafka import Consumer, Producer

c = Consumer({
    'bootstrap.servers': '127.0.0.1:9092',
    'group.id': 'retry-worker',
    'auto.offset.reset': 'earliest'
})
c.subscribe(['notification.retry'])

producer = Producer({'bootstrap.servers': '127.0.0.1:9092'})

print("Retry Worker started, waiting for failed messages...")

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue

    event = json.loads(msg.value())
    attempt = event.get("retry_count", 0) + 1
    channel = event.get("channel")

    if attempt <= 3:
        print(f"Retrying {channel} for user {event.get('user_id')} (Attempt {attempt}/3)...")
        time.sleep(5)  # Simple 5-second backoff
        
        event["retry_count"] = attempt
        # Send it back to its original queue to try again
        producer.produce(f"{channel}.queue", value=json.dumps(event))
    else:
        print(f"Max retries reached for user {event.get('user_id')}. Sending to DLQ.")
        # Failed 3 times? Send to Dead Letter Queue
        producer.produce("notification.dlq", value=json.dumps(event))
    
    producer.flush()
    c.commit(msg)