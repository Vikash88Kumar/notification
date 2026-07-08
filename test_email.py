import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import requests

# 1. Update the Database
DATABASE_URL = "postgresql+psycopg2://neondb_owner:npg_dQK2VDwNys8W@ep-restless-poetry-aocqywkx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# We import the User model from your app
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
from models import User

def create_or_update_user():
    print("Connecting to Neon Database...")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == 1).first()
        if user:
            print("User 1 exists. Updating email...")
            user.email = "vikashonly88@gmail.com"
        else:
            print("User 1 does not exist. Creating...")
            user = User(id=1, email="vikashonly88@gmail.com", fcm_token="dummy-token")
            db.add(user)
        db.commit()
        print("Successfully updated User 1 email in database!")
    except Exception as e:
        print(f"Failed to update database: {e}")
    finally:
        db.close()

# 2. Trigger the Event
def trigger_event():
    print("Triggering Email Event via FastAPI Backend...")
    url = "https://notification-olgf.onrender.com/events?user_id=1&event_type=user.alert"
    payload = {"item": "Hello from the script! This is a test email sent directly to vikashonly88@gmail.com"}
    try:
        res = requests.post(url, json=payload)
        print(f"Backend Response Code: {res.status_code}")
        print(f"Backend Response Body: {res.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    create_or_update_user()
    trigger_event()
