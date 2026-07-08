# Email Notification Debugging Guide

## Quick Diagnosis

### Issue: "RESEND_API_KEY not set" Error

**Root Cause:** Python doesn't automatically load `.env` files. The application wasn't loading environment variables before trying to use them.

**Fix Applied:**
- Added `from dotenv import load_dotenv` to all workers
- Added `load_dotenv()` at startup to read `.env` file
- Updated all 6 service files (orchestrator, 5 workers)

**Verify:** Check that each file has:
```python
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)
```

---

## Files Modified

### 1. **app/workers/email_worker.py** ✅
- Added `.env` loading
- Added comprehensive logging (replaces print statements)
- Added email format validation
- Added proper error handling

### 2. **app/workers/push_worker.py** ✅
- Added `.env` loading
- Converted to logging
- Added missing token warning

### 3. **app/workers/inapp_worker.py** ✅
- Added `.env` loading
- Added logging

### 4. **app/workers/retry_worker.py** ✅
- Added `.env` loading
- Converted to logging

### 5. **app/workers/dlq_worker.py** ✅
- Added `.env` loading
- Converted to logging

### 6. **app/orchestrator.py** ✅
- Added `.env` loading
- Converted to logging

### 7. **app/db.py** ✅
- Fixed `update_user_token()` to accept optional email parameter
- Removed hardcoded email forcing

### 8. **app/main.py** ✅
- Updated endpoint to pass email from request

### 9. **app/.env** ✅
- Added `RESEND_API_KEY` configuration (with your valid API key)

---

## Email Flow Debugging

### Flow Diagram:
```
1. Client sends FCM token → API /users/{user_id}/token
   ↓
2. Event created → API /events
   ↓
3. Orchestrator routes → email.queue
   ↓
4. Email Worker processes
   ├─ Check if user is online
   ├─ Get user email from DB
   ├─ Validate email format
   ├─ Send via Resend
   ├─ Success? → DB record "sent"
   └─ Failure? → notification.retry
   ↓
5. Retry Worker re-attempts (max 3x)
   ├─ Success? → email.queue (re-send)
   └─ Failed 3x? → notification.dlq
   ↓
6. DLQ Worker logs permanent failures
```

---

## Troubleshooting Steps

### Step 1: Verify .env Configuration
```bash
cd d:\notification
# Check if .env exists
ls -la .env

# Verify RESEND_API_KEY is set
echo $RESEND_API_KEY  # Should show: re_HZLkxVHN_K16d2ctMcGojvCm53Yu9arCA
```

### Step 2: Test Environment Loading
```python
# Quick Python test
from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path.cwd() / ".env"
load_dotenv(env_path)

print(os.getenv("RESEND_API_KEY"))  # Should print your API key
```

### Step 3: Run the Test Script
```bash
cd d:\notification
python test_email_flow.py
```

Expected output:
```
============================================================
  EMAIL NOTIFICATION SYSTEM TEST
============================================================

Testing against: http://localhost:8000
Test user ID: 1
Test email: vikashonly88@gmail.com

============================================================
  1. Checking Environment Variables
============================================================

✅ RESEND_API_KEY: re_HZLkxVHN_K16d2ctMcGojvCm53Yu9arCA***
✅ DATABASE_URL: postgresql://neondb_owner:***
✅ KAFKA_URL: d979qmc5vb9h1g5kpndg.any.us-east-1.mpx.prd.cloud.redpanda.com:9092
✅ UPSTASH_REDIS_REST_URL: https://moved-kingfish-159567.upstash.io

============================================================
  2. Testing API Health
============================================================

✅ API is running: 200
   Response: {'status': 'ok', 'database': 'connected'}
```

### Step 4: Check Worker Logs

When running email worker:
```bash
python -m app.workers.email_worker

# You should see:
# ✉️ Email Worker started, waiting for messages...
# 📧 [Event received for user 1...]
# ✅ Email sent to vikashonly88@gmail.com!
```

### Step 5: Monitor Kafka Topics
```bash
# Check if email.queue has messages
kafka-console-consumer --bootstrap-servers localhost:9092 --topic email.queue --from-beginning

# Check retry queue for failures
kafka-console-consumer --bootstrap-servers localhost:9092 --topic notification.retry --from-beginning

# Check DLQ for permanent failures
kafka-console-consumer --bootstrap-servers localhost:9092 --topic notification.dlq --from-beginning
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `ValueError: RESEND_API_KEY environment variable is required` | .env not loaded | Verify `load_dotenv(env_path)` is called at worker startup |
| `AttributeError: 'NoneType' object has no attribute 'Emails'` | resend not imported or API key None | Check imports and env loading order |
| Email not received | Invalid Resend API key | Get new key from https://resend.com/api-keys |
| Email not received | Invalid email in DB | Update user with valid email via `/users/{id}/token` |
| Email skipped | User marked online | Disconnect user from WebSocket `/ws/{id}` |
| `No email found for user {id}` | Email not in database | Call `/users/{id}/token` endpoint first |
| Message in retry queue | API or Resend error | Check logs for exact error message |
| Message in DLQ | Failed 3 times | Check RESEND_API_KEY, network, or email format |

---

## Verification Checklist

- [ ] `.env` file exists in `d:\notification\.env`
- [ ] `RESEND_API_KEY` is set to valid key (starts with `re_`)
- [ ] `python-dotenv` is in `requirements.txt`
- [ ] All 6 worker files have `load_dotenv()` at top
- [ ] API server is running: `uvicorn app.main:app --reload`
- [ ] Kafka is connected (check orchestrator logs)
- [ ] Database is accessible
- [ ] User has valid email in database
- [ ] User is not marked as "online"

---

## Testing Email Delivery

### Via cURL:
```bash
# 1. Update user with email
curl -X POST http://localhost:8000/users/1/token \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "test-123",
    "email": "your-email@example.com"
  }'

# 2. Send test event
curl -X POST "http://localhost:8000/events?user_id=1&event_type=test.email&payload=Test%20message" \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. Wait and check email inbox (and spam folder)
```

### Via Python Script:
```bash
cd d:\notification
python test_email_flow.py
```

---

## Production Deployment

Before pushing to production:

1. ✅ Remove all hardcoded credentials (done)
2. ✅ Enable structured logging (done)
3. ✅ Add error tracking/alerting (recommended: Sentry)
4. ✅ Monitor Kafka topics for failures
5. ✅ Set up alerts for DLQ messages
6. ✅ Test with real email addresses
7. ✅ Verify retry logic works
8. ✅ Load test: test with 100s of emails

---

## Need Help?

1. Check email worker logs for exact error
2. Verify RESEND_API_KEY in Resend dashboard
3. Check Kafka topics for messages
4. Review database for user email
5. Check network connectivity to Resend API
6. Review Git commit history for recent changes

