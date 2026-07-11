import time
from datetime import date

import redis

from app.core.config import get_settings

settings = get_settings()
_redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

PER_MINUTE_LIMIT_DEFAULT = 20


class RateLimitedError(Exception):
    """Mailbox hit its per-minute cap — retry shortly."""


class DailyLimitReachedError(Exception):
    """Mailbox hit its daily cap — retry tomorrow."""


def check_and_increment(
    mailbox_id: str, daily_limit: int, per_minute_limit: int = PER_MINUTE_LIMIT_DEFAULT
) -> None:
    minute_key = f"mailbox:{mailbox_id}:minute:{int(time.time() // 60)}"
    day_key = f"mailbox:{mailbox_id}:day:{date.today().isoformat()}"

    minute_count = _redis_client.incr(minute_key)
    _redis_client.expire(minute_key, 60)
    if minute_count > per_minute_limit:
        raise RateLimitedError(f"Mailbox {mailbox_id} exceeded {per_minute_limit}/minute")

    day_count = _redis_client.incr(day_key)
    _redis_client.expire(day_key, 172_800)
    if day_count > daily_limit:
        raise DailyLimitReachedError(f"Mailbox {mailbox_id} exceeded daily limit of {daily_limit}")
