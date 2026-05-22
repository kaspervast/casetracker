from collections import deque
from collections.abc import Iterable
from dataclasses import dataclass
from threading import Lock
from time import monotonic

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


@dataclass(frozen=True)
class RateLimitRule:
    prefix: str
    limit: int
    window_seconds: int


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rules: Iterable[RateLimitRule]):
        super().__init__(app)
        self.rules = tuple(rules)
        self._lock = Lock()
        self._buckets: dict[tuple[str, str], deque[float]] = {}

    def _allowed(self, scope: str, client_ip: str, limit: int, window_seconds: int) -> bool:
        key = (scope, client_ip)
        now = monotonic()
        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and now - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        for rule in self.rules:
            if request.url.path.startswith(rule.prefix):
                if not self._allowed(rule.prefix, client_ip, rule.limit, rule.window_seconds):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded"},
                    )
                break
        return await call_next(request)
