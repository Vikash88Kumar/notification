# producer.py
from confluent_kafka import Producer
import json

p = Producer({'bootstrap.servers': 'localhost:9092'})

def publish(topic: str, key: str, value: dict):
    p.produce(topic, key=key.encode(), value=json.dumps(value).encode())
    p.flush()