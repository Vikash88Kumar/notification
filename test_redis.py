from upstash_redis import Redis
import os

try:
    url = "https://moved-kingfish-159567.upstash.io"
    token = ""
    redis_client = Redis(url=url, token=token)
    print("Success")
except Exception as e:
    print(f"Failed: {type(e).__name__} - {e}")
