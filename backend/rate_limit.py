from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import HTTPException, status


@dataclass
class _Bucket:
    timestamps: list[datetime] = field(default_factory=list)


class InMemoryRateLimiter:
    """Simple per-key sliding-window rate limiter (single-process)."""

    def __init__(self) -> None:
        self._buckets: dict[str, _Bucket] = defaultdict(_Bucket)
        self._lock = Lock()

    def hit(self, key: str, *, limit: int, window: timedelta) -> None:
        now = datetime.now(timezone.utc)
        cutoff = now - window
        with self._lock:
            bucket = self._buckets[key]
            bucket.timestamps = [ts for ts in bucket.timestamps if ts > cutoff]
            if len(bucket.timestamps) >= limit:
                oldest = bucket.timestamps[0]
                retry_after = max(
                    1,
                    int((oldest + window - now).total_seconds()) + 1,
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.timestamps.append(now)


rate_limiter = InMemoryRateLimiter()


def check_rate_limit(uid: str, endpoint: str, *, limit: int, window_hours: int = 1) -> None:
    rate_limiter.hit(
        f"{endpoint}:{uid}",
        limit=limit,
        window=timedelta(hours=window_hours),
    )
