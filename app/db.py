import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

try:
    from .models import Base, Notification, User, UserNotificationPref
except ImportError:
    from models import Base, Notification, User, UserNotificationPref


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@127.0.0.1:5433/notifications" # <-- 5433 here
)

# SQLAlchemy requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)


engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"Database initialization skipped: {exc}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_pref(user_id: int, channel: str) -> str:
    with SessionLocal() as db:
        pref = (
            db.query(UserNotificationPref)
            .filter(UserNotificationPref.user_id == user_id)
            .filter(UserNotificationPref.channel == channel)
            .first()
        )
        return pref.pref if pref else "all"


def save_notification(event: dict, channel: str, status: str = "pending") -> Notification:
    with SessionLocal() as db:
        notification = Notification(
            user_id=event.get("user_id"),
            event_type=event.get("event_type"),
            payload=event.get("payload", {}),
            channel=channel,
            status=status,
            read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification


def get_user_email(user_id: int):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        return user.email if user else None


def get_fcm_token(user_id: int):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        return user.fcm_token if user else None

def update_user_token(user_id: int, new_token: str):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.fcm_token = new_token
            db.commit() # This is critical to save the data
            return True
        else:
            # Auto-create the user for the demo
            user = User(id=user_id, email="demo@example.com", fcm_token=new_token)
            db.add(user)
            db.commit()
            return True