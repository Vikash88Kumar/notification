#!/usr/bin/env python3
"""
Email Notification Test Script
This script tests the email notification flow end-to-end
"""

import os
import sys
import requests
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:8000")
USER_ID = 1
TEST_EMAIL = "vikashonly88@gmail.com"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_health():
    """Test if API is running"""
    print_section("1. Testing API Health")
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        print(f"✅ API is running: {resp.status_code}")
        print(f"   Response: {resp.json()}")
        return True
    except Exception as e:
        print(f"❌ API is not running: {e}")
        return False

def test_env_vars():
    """Check if all required env vars are set"""
    print_section("2. Checking Environment Variables")
    
    required_vars = [
        "RESEND_API_KEY",
        "DATABASE_URL",
        "KAFKA_URL",
        "UPSTASH_REDIS_REST_URL",
    ]
    
    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            masked = value[:20] + "***" if len(value) > 20 else value
            print(f"✅ {var}: {masked}")
        else:
            print(f"❌ {var}: NOT SET")
            all_set = False
    
    return all_set

def test_user_token_update():
    """Update user with FCM token and email"""
    print_section("3. Updating User with Token & Email")
    
    payload = {
        "fcm_token": "test-token-123456",
        "email": TEST_EMAIL
    }
    
    try:
        resp = requests.post(
            f"{API_URL}/users/{USER_ID}/token",
            json=payload,
            timeout=10
        )
        print(f"✅ User update successful: {resp.status_code}")
        print(f"   Response: {resp.json()}")
        return True
    except Exception as e:
        print(f"❌ User update failed: {e}")
        return False

def test_event_creation():
    """Create a test notification event"""
    print_section("4. Creating Notification Event")
    
    payload = {
        "user_id": USER_ID,
        "event_type": "test.notification",
        "payload": "🧪 This is a test email from the notification system!"
    }
    
    try:
        resp = requests.post(
            f"{API_URL}/events",
            params=payload,
            json=payload,
            timeout=10
        )
        print(f"✅ Event created successfully: {resp.status_code}")
        print(f"   Response: {resp.json()}")
        return resp.json().get("event_id")
    except Exception as e:
        print(f"❌ Event creation failed: {e}")
        return None

def main():
    print("\n" + "="*60)
    print("  EMAIL NOTIFICATION SYSTEM TEST")
    print("="*60)
    print(f"\nTesting against: {API_URL}")
    print(f"Test user ID: {USER_ID}")
    print(f"Test email: {TEST_EMAIL}\n")
    
    # Run tests
    if not test_env_vars():
        print("\n❌ Missing environment variables! Cannot proceed.")
        print("   Update your .env file with required variables.")
        return False
    
    if not test_health():
        print("\n❌ API is not running!")
        print("   Start the API with: python -m uvicorn app.main:app --reload")
        return False
    
    if not test_user_token_update():
        print("\n❌ Failed to update user!")
        return False
    
    event_id = test_event_creation()
    if not event_id:
        print("\n❌ Failed to create event!")
        return False
    
    # Wait for processing
    print_section("5. Waiting for Email Processing")
    print("⏳ Waiting 5 seconds for email to be sent...")
    print("   (Check your email inbox for: onboarding@resend.dev)")
    
    for i in range(5, 0, -1):
        print(f"   {i}...", end="\r")
        time.sleep(1)
    
    print("\n✅ Test complete!")
    print("\n📋 SUMMARY:")
    print(f"   Event ID: {event_id}")
    print(f"   User ID: {USER_ID}")
    print(f"   Email: {TEST_EMAIL}")
    print("\n📧 Check your email inbox (and spam folder) for the test notification!")
    print("\n💡 TROUBLESHOOTING:")
    print("   1. Check logs: python -m app.workers.email_worker")
    print("   2. Verify RESEND_API_KEY is correct")
    print("   3. Check Kafka topics: email.queue, notification.retry")
    print("   4. Verify database connection")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
