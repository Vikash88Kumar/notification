# Email Notification Testing Guide

## Setup

1. **Get a Resend API Key**
   - Sign up at https://resend.com
   - Go to API Keys and create a new key
   - Update `.env` file with your key:
     ```
     RESEND_API_KEY=re_your_actual_key_here
     ```

2. **Verify Database is running**
   ```bash
   # Check connection
   curl https://notification-olgf.onrender.com/health
   ```
   Expected response: `{"status": "ok", "database": "connected"}`

## Test Email Notification

### Step 1: Update User with Email
```bash
curl -X POST http://localhost:8000/users/1/token \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "dummy-token-123",
    "email": "your-email@example.com"
  }'
```

**Expected Response:**
```json
{"status": "success"}
```

### Step 2: Trigger an Event
```bash
curl -X POST http://localhost:8000/events \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "event_type": "user.alert",
    "payload": "Hello! This is a test email notification."
  }'
```

**Expected Response:**
```json
{
  "status": "queued",
  "event_id": "uuid-here"
}
```

### Step 3: Check Email Delivery
- Wait 2-5 seconds for processing
- Check your email inbox
- Look for email from `onboarding@resend.dev`
- Subject should be: `user.alert`

## Troubleshooting

### Email Not Received

1. **Check Resend API Key**
   ```bash
   # Verify it's set
   echo $RESEND_API_KEY
   ```

2. **Check Email Worker Logs**
   - Look for errors like "Invalid email format" or "Resend error"
   - Check retry queue for failed deliveries

3. **Verify User Email in Database**
   ```bash
   # SSH into backend or check database directly
   SELECT id, email FROM users WHERE id = 1;
   ```

4. **Check if User is Online**
   - Email skipped if user is marked as "online"
   - Connect to WebSocket to test: `ws://localhost:8000/ws/1`

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `RESEND_API_KEY not set` | Missing env var | Set in .env and restart worker |
| `Invalid email format` | Bad email in DB | Update with valid email |
| `User is online. Skipping` | User connected to app | Disconnect from app first |
| `Failed to parse message` | Corrupted Kafka message | Check Kafka connection |

## Production Checklist

- [ ] Resend API key is set in environment variables (NOT hardcoded)
- [ ] Email logging is enabled for debugging
- [ ] Retry queue is monitored
- [ ] User emails are properly validated
- [ ] Test with real email addresses
- [ ] Monitor email delivery status in Resend dashboard
- [ ] Set up alerts for failed deliveries

## Testing Status

### Before Fixes ❌
- Hardcoded Resend API key (security risk)
- Hardcoded user email (breaks multi-user)
- No error logging
- No email validation
- No proper exception handling

### After Fixes ✅
- Environment variable for API key
- Flexible email handling
- Comprehensive error logging
- Email format validation
- Proper exception handling with retry logic
