
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(Text, nullable=True)
    fcm_token = Column(Text, nullable=True)

    notifications = relationship("Notification", back_populates="user")
    notification_prefs = relationship("UserNotificationPref", back_populates="user")


class UserNotificationPref(Base):
    __tablename__ = "user_notification_prefs"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, nullable=False)
    channel = Column(String(20), primary_key=True, nullable=False)
    pref = Column(String(20), nullable=False, default="all")

    user = relationship("User", back_populates="notification_prefs")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(String(100), nullable=True)
    payload = Column(JSONB, nullable=True)
    channel = Column(String(20), nullable=True)
    status = Column(String(20), nullable=True, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read = Column(Boolean, default=False)

    user = relationship("User", back_populates="notifications")