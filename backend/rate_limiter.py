import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, Request

class RateLimiter:
    """
    Thread-safe in-memory sliding window Rate Limiter dependency for FastAPI.
    """
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.lock = Lock()

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        cutoff = now - 60

        with self.lock:
            # Clean expired timestamps older than 60s
            self.requests[client_ip] = [t for t in self.requests[client_ip] if t > cutoff]

            if len(self.requests[client_ip]) >= self.requests_per_minute:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: Maximum {self.requests_per_minute} requests per minute allowed."
                )

            self.requests[client_ip].append(now)

# Rate limiter instances for API endpoints
limiter_standard = RateLimiter(requests_per_minute=60)
limiter_heavy = RateLimiter(requests_per_minute=10)
