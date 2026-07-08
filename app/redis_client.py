import os

from upstash_redis import Redis

UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "https://moved-kingfish-159567.upstash.io")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

redis_client = Redis(url=UPSTASH_REDIS_REST_URL, token=UPSTASH_REDIS_REST_TOKEN)


def set_presence(user_id: int, value: str, ttl: int = 60) -> None:
    redis_client.set(f"presence:{user_id}", value, ex=ttl)


def get_presence(user_id: int):
    return redis_client.get(f"presence:{user_id}")


def clear_presence(user_id: int) -> None:
    redis_client.delete(f"presence:{user_id}")