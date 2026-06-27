from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from models import PlanResult
from rate_limit import InMemoryRateLimiter, check_rate_limit


def test_rate_limiter_allows_requests_under_limit() -> None:
    limiter = InMemoryRateLimiter()
    for _ in range(3):
        limiter.hit("user:discover", limit=3, window=timedelta(hours=1))


def test_rate_limiter_blocks_when_limit_exceeded() -> None:
    limiter = InMemoryRateLimiter()
    for _ in range(2):
        limiter.hit("user:plan", limit=2, window=timedelta(hours=1))

    with pytest.raises(HTTPException) as exc_info:
        limiter.hit("user:plan", limit=2, window=timedelta(hours=1))

    assert exc_info.value.status_code == 429
    assert exc_info.value.detail == "Rate limit exceeded"
    assert "Retry-After" in exc_info.value.headers


def test_check_rate_limit_uses_uid_and_endpoint() -> None:
    limiter = InMemoryRateLimiter()
    for _ in range(30):
        limiter.hit("discover:uid-1", limit=30, window=timedelta(hours=1))

    with pytest.raises(HTTPException):
        limiter.hit("discover:uid-1", limit=30, window=timedelta(hours=1))


@patch("main.run_weekend_planner")
def test_plan_rate_limit_returns_429(
    mock_planner: MagicMock,
    client: TestClient,
    api_env: None,
    sample_itinerary,
    sample_filter_stats,
) -> None:
    mock_planner.return_value = PlanResult(
        itinerary=sample_itinerary,
        cited_path="/tmp/cited.md",
        trace_id="trace-abc",
        filter_stats=sample_filter_stats,
    )
    payload = {
        "location": "Austin, TX",
        "budget": 100,
        "diet": "vegetarian",
        "activities": "music",
    }

    for _ in range(10):
        response = client.post("/plan", json=payload)
        assert response.status_code == 200

    response = client.post("/plan", json=payload)
    assert response.status_code == 429
    assert response.headers.get("Retry-After")
    assert "rate limit" in response.json()["detail"].lower()
