import os

import redis


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def set_presence(user_id: int, value: str, ttl: int = 60) -> None:
    redis_client.set(f"presence:{user_id}", value, ex=ttl)


def get_presence(user_id: int):
    return redis_client.get(f"presence:{user_id}")


def clear_presence(user_id: int) -> None:
    redis_client.delete(f"presence:{user_id}")