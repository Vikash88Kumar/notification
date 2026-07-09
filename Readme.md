# 🚀 Notification Engine SaaS

A highly scalable, multi-tenant, stateless Notification Engine built for modern developer teams. Plug it into your app and instantly send reliable Push, Email, and In-App notifications.

## 🔥 Key Features

- **Stateless Integration**: No need to sync your database with ours! Pass `email` or `fcm_token` directly in your event payload, and we will deliver it instantly.
- **Smart Presence Detection**: Automatically detects if your users are online (via WebSocket or the Presence API) and suppresses noisy email/push notifications if they are already active in your app.
- **Force Delivery**: Send critical alerts (like password resets or payment receipts) that bypass all presence checks and force delivery to all channels.
- **Multi-Channel Fan-out**: Fire one event, and let our Kafka-powered orchestrator handle routing it to Email (Resend), Push (Firebase Cloud Messaging), and In-App queues.
- **High Throughput**: Built on top of Redpanda (Kafka) and FastAPI for blazing-fast asynchronous processing.

---

## 🛠 Tech Stack
- **API Gateway**: FastAPI (Python)
- **Event Bus**: Redpanda / Kafka (`confluent-kafka-python`)
- **Database**: Neon (PostgreSQL) + Upstash (Redis)
- **Providers**: Firebase Cloud Messaging (Push), Resend (Email)
- **Frontend / Docs**: Next.js-style React UI

---

## ⚡ Quick Start: Sending an Event

Send a single `POST` request to the engine, and we handle the rest.

### `POST /events`

**Headers:**
```http
Content-Type: application/json
X-API-Key: your_secure_api_key
```

**Body:**
```json
{
  "user_id": "yourApp_user_123",
  "event_type": "payment.success",
  "channels": ["email", "push", "inapp"],
  "presence": "offline",
  "force_delivery": true,
  "contact_info": {
    "email": "customer@gmail.com",
    "fcm_token": "fGhz7...xyZ"
  },
  "payload": {
    "item": "Your payment of $49.99 was successful! Thank you for subscribing."
  }
}
```

### 🧠 Smart Presence API

If you don't want to pass `"presence"` in every payload, you can use our Presence API to let the engine maintain the state!

**Mark Online:** `POST /users/{user_id}/presence`
**Mark Offline:** `DELETE /users/{user_id}/presence`

If a user is marked as online, the engine will intelligently skip sending Emails and Push notifications to avoid spam, unless you use `"force_delivery": true`.

---

## 🏗 Architecture Overview

1. **Ingestion**: Your app hits the FastAPI `/events` endpoint.
2. **Kafka Stream**: The event is pushed to the `notification.events` Kafka topic.
3. **Orchestrator**: A consumer reads the event, evaluates Presence and routing preferences, and fans out the event into specific queues (`email.queue`, `push.queue`, `inapp.queue`).
4. **Workers**: Dedicated Python workers consume from their specific queues, extract the stateless contact info, and execute the delivery using 3rd-party SDKs (Firebase/Resend).

![Architecture Overview](https://img.shields.io/badge/Architecture-Kafka%20%2B%20FastAPI-blue?style=for-the-badge)

---

## 🚀 Deployment

The backend is fully containerized and easily deployable to Render or AWS via Docker.
1. Set up your `.env` variables (`API_KEY`, `RESEND_API_KEY`, Neon DB URL, Upstash Redis URL, Kafka Bootstrap Servers).
2. Start the FastAPI server (`uvicorn app.main:app`).
3. Start the background workers (`python -m app.orchestrator`, `python -m app.workers.email_worker`, etc.).

Enjoy building with the ultimate Notification SaaS Engine!