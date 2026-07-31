import os
import sys
import json
import requests

# Fix Windows console stdout encoding for unicode chars
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import firebase_admin
from firebase_admin import credentials, messaging

def test_firebase_credentials():
    print("\n--- 1. Testing Firebase Admin Key & Credentials ---")
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase-key.json")
    if not os.path.exists(key_path):
        print(f"[FAIL] Key file not found at {key_path}")
        return False

    try:
        cred = credentials.Certificate(key_path)
        if not firebase_admin._apps:
            app = firebase_admin.initialize_app(cred)
        else:
            app = firebase_admin.get_app()

        print(f"[OK] Firebase initialized successfully!")
        print(f"     Project ID : {app.project_id}")

        # Dry run message test
        test_msg = messaging.Message(
            notification=messaging.Notification(
                title="Test Push",
                body="Testing FCM credentials dry run"
            ),
            token="dummy_fcm_token_for_dry_run_testing_12345"
        )
        try:
            messaging.send(test_msg, dry_run=True)
        except messaging.UnregisteredError:
            print("[OK] FCM API dry run response: Authenticated successfully with Firebase Cloud Messaging (token unregistered as expected).")
        except Exception as exc:
            if "NotRegistered" in str(exc) or "unregistered" in str(exc).lower():
                print("[OK] FCM API dry run response: Authenticated successfully with Firebase Cloud Messaging.")
            else:
                print(f"[WARN] FCM dry run returned: {exc}")

        return True
    except Exception as e:
        print(f"[FAIL] Firebase credentials test failed: {e}")
        return False


def test_microservice_event(user_id="test-user-id", fcm_token=None):
    print("\n--- 2. Testing Notification Microservice Event Endpoint ---")
    url = "http://localhost:10000/events"
    headers = {
        "X-API-Key": "default-dev-key",
        "Content-Type": "application/json"
    }

    payload = {
        "user_id": user_id,
        "event_type": "borrow.requested",
        "channels": ["push"],
        "force_delivery": True,
        "payload": {
            "title": "Push Notification Test",
            "message": "Push Notification service is working properly!",
            "link": "/resources"
        }
    }

    if fcm_token:
        payload["contact_info"] = {"fcm_token": fcm_token}

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        if res.status_code == 200:
            print("[OK] Successfully queued event via Notification Microservice!")
            print("     Response:", res.json())
        else:
            print(f"[WARN] Microservice returned status {res.status_code}: {res.text}")
    except requests.exceptions.ConnectionError:
        print("[INFO] Notification microservice is not currently running on http://localhost:10000.")
        print("       (Start it with: uvicorn app.main:app --port 10000)")


if __name__ == "__main__":
    print("=" * 60)
    print("      CRSS PUSH NOTIFICATION DIAGNOSTIC & TEST TOOL")
    print("=" * 60)
    
    success = test_firebase_credentials()
    if success:
        test_microservice_event()
    print("\nDone.")
