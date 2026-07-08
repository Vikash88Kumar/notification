# Email Notification Issues & Fixes

## Critical Issues Found

### 1. 🔴 Security: Hardcoded Resend API Key
**File:** `app/workers/email_worker.py` (Line 8)
**Issue:** API key is exposed in the source code
```python
resend.api_key = "re_WqXvAcAC_3sbX2zth4Ps6sZ7syMjFZ38w"
```
**Fix:** Use environment variable instead
```python
resend.api_key = os.getenv("RESEND_API_KEY")
```

### 2. 🔴 Hardcoded Email Address
**File:** `app/db.py` (Line 73, 78)
**Issue:** User email is forced to "vikashonly88@gmail.com" regardless of user input
```python
user.email = "vikashonly88@gmail.com"  # Force update the email
```
**Impact:** Email notifications always go to this single email, not to actual user emails
**Fix:** Allow flexible email handling

### 3. 🟡 Missing Error Handling
**File:** `app/workers/email_worker.py`
**Issues:**
- No validation of email format
- No retry count limit (could loop forever)
- No logging for debugging
- Exception doesn't capture the actual error details properly

### 4. 🟡 Kafka Configuration Missing
**File:** Missing `app/kafka_config.py`
**Issue:** Cannot verify Kafka connection details
**Impact:** Email worker may fail silently if Kafka config is wrong

### 5. 🟡 Missing Environment Variables
**File:** Missing `.env` file documentation
**Issue:** No clear documentation of required env vars for email setup

## Verification Steps

1. Check if Resend API key is valid (current one looks like test key)
2. Verify user email is stored correctly in database (not hardcoded)
3. Test email delivery with actual user email
4. Check Kafka topics exist: `email.queue`, `notification.retry`
5. Monitor retry queue for errors

## Workflow Check

✅ Event created → Orchestrator routes to email.queue → Email Worker sends via Resend → Success/Retry

**Potential Breakpoints:**
- No user email in database (handled: skipped)
- Invalid Resend API key (error caught, sent to retry)
- User is online (handled: skipped to avoid spam)
- Email service down (error caught, sent to retry)

