# 2-Day Build: Notification System (Kafka + FastAPI + Postgres + Redis + FCM + Resend)

## Stack
- **API**: FastAPI (Python)
- **Broker**: Kafka (via Docker, `confluent-kafka-python`)
- **DB**: Postgres (prefs, audit log) + Redis (presence, dedup, rate limit)
- **Push**: Firebase Cloud Messaging
- **Email**: Resend
- **In-app**: WebSocket (FastAPI native) + Postgres unread table

---

## Day 1 — Infra + Core Pipeline (Event → Kafka → Fan-out → In-App)

### 1. Docker Compose (30 min)
```yaml
# docker-compose.yml
version: "3.8"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: notifications
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
```
Run: `docker compose up -d`

### 2. Create Kafka Topics (15 min)
```bash
docker exec -it <kafka_container> kafka-topics --create --topic notification.events --partitions 6 --bootstrap-server localhost:9092
docker exec -it <kafka_container> kafka-topics --create --topic email.queue --partitions 3 --bootstrap-server localhost:9092
docker exec -it <kafka_container> kafka-topics --create --topic push.queue --partitions 3 --bootstrap-server localhost:9092
docker exec -it <kafka_container> kafka-topics --create --topic inapp.queue --partitions 3 --bootstrap-server localhost:9092
docker exec -it <kafka_container> kafka-topics --create --topic notification.retry --partitions 3 --bootstrap-server localhost:9092
docker exec -it <kafka_container> kafka-topics --create --topic notification.dlq --partitions 3 --bootstrap-server localhost:9092
```

### 3. Project Structure (15 min)
```
notif-system/
  app/
    main.py              # FastAPI app + WebSocket
    producer.py           # Kafka producer helper
    orchestrator.py        # Consumer: notification.events → fan-out
    workers/
      email_worker.py
      push_worker.py
      inapp_worker.py
    models.py             # SQLAlchemy models   
    db.py
    redis_client.py
  requirements.txt
```

```
# requirements.txt
fastapi
uvicorn[standard]
confluent-kafka
sqlalchemy
psycopg2-binary
redis
pydantic
resend
firebase-admin
python-dotenv
```

### 4. Postgres Schema (20 min)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  fcm_token TEXT
);

CREATE TABLE user_notification_prefs (
  user_id INT REFERENCES users(id),
  channel TEXT,          -- 'email' | 'push' | 'inapp'
  pref TEXT,             -- 'all' | 'mentions' | 'never'
  PRIMARY KEY (user_id, channel)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id INT REFERENCES users(id),
  event_type TEXT,
  payload JSONB,
  channel TEXT,
  status TEXT,           -- 'pending'|'sent'|'failed'|'dlq'
  created_at TIMESTAMP DEFAULT now(),
  read BOOLEAN DEFAULT false
);
```

### 5. FastAPI: Event Ingestion + Kafka Producer (1 hr)
```python
# producer.py
from confluent_kafka import Producer
import json

p = Producer({'bootstrap.servers': 'localhost:9092'})

def publish(topic: str, key: str, value: dict):
    p.produce(topic, key=key.encode(), value=json.dumps(value).encode())
    p.flush()
```
```python
# main.py (partial)
from fastapi import FastAPI
from producer import publish
import uuid

app = FastAPI()

@app.post("/events")
def create_event(user_id: int, event_type: str, payload: dict):
    event = {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "event_type": event_type,
        "payload": payload
    }
    publish("notification.events", key=str(user_id), value=event)
    return {"status": "queued", "event_id": event["event_id"]}
```

### 6. Orchestrator: Consume events → check prefs → fan-out (2 hrs)
```python
# orchestrator.py
from confluent_kafka import Consumer
from producer import publish
from db import get_pref  # reads user_notification_prefs
import json

c = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'orchestrator',
    'auto.offset.reset': 'earliest'
})
c.subscribe(['notification.events'])

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    user_id = event["user_id"]

    for channel in ["email", "push", "inapp"]:
        pref = get_pref(user_id, channel)
        if pref == "never":
            continue
        publish(f"{channel}.queue", key=str(user_id), value=event)
    c.commit(msg)
```

### 7. In-App Worker + WebSocket delivery (2 hrs)
```python
# main.py (WebSocket part)
from fastapi import WebSocket

active_connections: dict[int, WebSocket] = {}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    active_connections[user_id] = websocket
    redis_client.set(f"presence:{user_id}", "online", ex=60)
    try:
        while True:
            await websocket.receive_text()  # heartbeat/ping
            redis_client.set(f"presence:{user_id}", "online", ex=60)
    except:
        del active_connections[user_id]
        redis_client.delete(f"presence:{user_id}")
```
```python
# workers/inapp_worker.py
from confluent_kafka import Consumer
import json, uuid
from db import save_notification  # insert into notifications table

c = Consumer({'bootstrap.servers': 'localhost:9092', 'group.id': 'inapp-worker'})
c.subscribe(['inapp.queue'])

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    save_notification(event, channel="inapp", status="sent")
    # if user connected via WebSocket, push live; else it'll show as unread on next fetch
    c.commit(msg)
```

**End of Day 1 checkpoint:** POST `/events` → shows up as an unread row in Postgres and live-pushes over WebSocket if the user's tab is open.

---

## Day 2 — Push, Email, Presence Logic, Retry/DLQ

### 8. Firebase Push Worker (1.5 hrs)
```bash
pip install firebase-admin
```
```python
# workers/push_worker.py
import firebase_admin
from firebase_admin import credentials, messaging
from confluent_kafka import Consumer, Producer
import json
from db import get_fcm_token, get_presence

firebase_admin.initialize_app(credentials.Certificate("firebase-key.json"))
c = Consumer({'bootstrap.servers': 'localhost:9092', 'group.id': 'push-worker'})
c.subscribe(['push.queue'])
retry_producer = Producer({'bootstrap.servers': 'localhost:9092'})

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    user_id = event["user_id"]

    # Skip push if user is actively online in-app (avoid duplicate ping)
    if get_presence(user_id) == "online":
        c.commit(msg)
        continue

    token = get_fcm_token(user_id)
    try:
        messaging.send(messaging.Message(
            notification=messaging.Notification(
                title="New notification",
                body=str(event["payload"])
            ),
            token=token
        ))
    except Exception as e:
        retry_producer.produce("notification.retry", key=str(user_id),
                                value=json.dumps({**event, "channel": "push", "error": str(e)}))
    c.commit(msg)
```

### 9. Resend Email Worker (1 hr)
```bash
pip install resend
```
```python
# workers/email_worker.py
import resend, json
from confluent_kafka import Consumer, Producer
from db import get_user_email

resend.api_key = "re_your_api_key"
c = Consumer({'bootstrap.servers': 'localhost:9092', 'group.id': 'email-worker'})
c.subscribe(['email.queue'])
retry_producer = Producer({'bootstrap.servers': 'localhost:9092'})

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    try:
        resend.Emails.send({
            "from": "notifications@yourdomain.com",
            "to": get_user_email(event["user_id"]),
            "subject": "You have a new notification",
            "html": f"<p>{event['payload']}</p>"
        })
    except Exception as e:
        retry_producer.produce("notification.retry", key=str(event["user_id"]),
                                value=json.dumps({**event, "channel": "email", "error": str(e)}))
    c.commit(msg)
```

### 10. Retry + DLQ Worker (2 hrs)
```python
# workers/retry_worker.py
import json, time
from confluent_kafka import Consumer, Producer

c = Consumer({'bootstrap.servers': 'localhost:9092', 'group.id': 'retry-worker'})
c.subscribe(['notification.retry'])
p = Producer({'bootstrap.servers': 'localhost:9092'})

MAX_RETRIES = 10

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    retries = event.get("retry_count", 0) + 1

    if retries > MAX_RETRIES:
        p.produce("notification.dlq", key=msg.key(), value=json.dumps(event))
    else:
        time.sleep(min(2 ** retries, 60))  # exponential backoff, capped
        event["retry_count"] = retries
        p.produce(f"{event['channel']}.queue", key=msg.key(), value=json.dumps(event))
    c.commit(msg)
```
```python
# workers/dlq_worker.py — just logs for now, build dashboard later
from confluent_kafka import Consumer
from db import save_notification
import json

c = Consumer({'bootstrap.servers': 'localhost:9092', 'group.id': 'dlq-worker'})
c.subscribe(['notification.dlq'])

while True:
    msg = c.poll(1.0)
    if msg is None or msg.error():
        continue
    event = json.loads(msg.value())
    save_notification(event, channel=event.get("channel"), status="dlq")
    print(f"DLQ: {event}")  # replace with alert (Slack webhook, email to on-call)
    c.commit(msg)
```

### 11. Presence-Aware Orchestrator Update (1 hr)
Update `orchestrator.py` to check Redis presence **before** fan-out, so an online user doesn't get push+email for something already shown live in-app:
```python
from redis_client import get_presence

for channel in ["email", "push", "inapp"]:
    pref = get_pref(user_id, channel)
    if pref == "never":
        continue
    if channel in ("push", "email") and get_presence(user_id) == "online":
        continue  # already getting it live in-app
    publish(f"{channel}.queue", key=str(user_id), value=event)
```

### 12. Run everything + test (1 hr)
```bash
uvicorn app.main:app --reload &
python app/orchestrator.py &
python app/workers/inapp_worker.py &
python app/workers/push_worker.py &
python app/workers/email_worker.py &
python app/workers/retry_worker.py &
python app/workers/dlq_worker.py &
```
Test:
```bash
curl -X POST "http://localhost:8000/events?user_id=1&event_type=user.send_req" \
  -H "Content-Type: application/json" \
  -d '{"item":"Drill"}'
```

---

## What you'll have after 2 days
- Working end-to-end pipeline: API → Kafka → orchestrator → 3 channel queues → workers → providers
- Presence-aware suppression (no duplicate push when user's online)
- Retry with backoff + DLQ with logging
- In-app WebSocket delivery + unread persistence

## What's deliberately deferred (Day 3+ if you continue)
- Idempotency/dedup cache in Redis (prevent double-send on retry)
- Rate limiting per provider (token bucket)
- Full preference flowchart (mute/DND/mentions granularity)
- Monitoring dashboard (queue depth, DLQ size, delivery success rate)
- Horizontal scaling / multiple consumer instances per group
#   S c a l a b l e - N o t i f i c a t i o n - S y s t e m  
 