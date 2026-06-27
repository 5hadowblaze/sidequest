from __future__ import annotations

import os
from typing import Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from models import (
    CalendarSlot,
    CandidateItem,
    FilterStats,
    ItineraryItem,
    PlanRequest,
    UserConstraintContext,
)


@pytest.fixture
def sample_calendar_slots() -> list[CalendarSlot]:
    return [
        CalendarSlot(date="saturday", period="afternoon"),
        CalendarSlot(date="sunday", period="morning"),
    ]


@pytest.fixture
def sample_plan_request(sample_calendar_slots: list[CalendarSlot]) -> PlanRequest:
    return PlanRequest(
        location="Austin, TX",
        budget=100.0,
        diet="vegetarian",
        activities="music, outdoor",
        accessibility="wheelchair",
        calendar_slots=sample_calendar_slots,
    )


@pytest.fixture
def sample_context(sample_calendar_slots: list[CalendarSlot]) -> UserConstraintContext:
    return UserConstraintContext(
        budget=80.0,
        diet="vegan",
        activities="art, music",
        accessibility="wheelchair accessible",
        home_location="Austin, TX",
        calendar_slots=sample_calendar_slots,
    )


@pytest.fixture
def sample_candidates() -> list[CandidateItem]:
    return [
        CandidateItem(
            id="evt_1",
            type="event",
            title="Saturday Jazz in Austin",
            url="https://example.com/jazz",
            snippet="Live jazz saturday evening downtown Austin",
            price_estimate=25.0,
            location="Austin, TX",
            tags="music,jazz,outdoor,vegan",
            date_hint="Saturday afternoon",
        ),
        CandidateItem(
            id="rst_1",
            type="restaurant",
            title="Vegan Garden Austin",
            url="https://example.com/vegan",
            snippet="Vegetarian and vegan plates under budget",
            price_estimate=35.0,
            location="Austin, TX",
            tags="vegan,vegetarian",
            date_hint="",
        ),
        CandidateItem(
            id="evt_2",
            type="event",
            title="Expensive Gala NYC",
            url="https://example.com/gala",
            snippet="Black tie gala in Manhattan",
            price_estimate=500.0,
            location="New York, NY",
            tags="gala",
            date_hint="Sunday night",
        ),
    ]


@pytest.fixture
def sample_itinerary() -> list[ItineraryItem]:
    return [
        ItineraryItem(
            time="Saturday 14:00",
            activity="Live music",
            venue="Saturday Jazz in Austin",
            cost="$25",
            diet_access="—",
            source_url="https://example.com/jazz",
            source_index=1,
        ),
        ItineraryItem(
            time="Saturday 19:00",
            activity="Dining",
            venue="Vegan Garden Austin",
            cost="$35",
            diet_access="vegetarian",
            source_url="https://example.com/vegan",
            source_index=2,
        ),
    ]


@pytest.fixture
def sample_filter_stats() -> FilterStats:
    return FilterStats(
        candidates_in=3,
        candidates_out=2,
        filter_method="sdk",
        concept_name="weekend_planner_matches",
    )


@pytest.fixture
def api_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    monkeypatch.setenv("PMTX_TOKEN", "test-pmtx-token")


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> Generator[None, None, None]:
    from rate_limit import rate_limiter

    rate_limiter._buckets.clear()
    yield
    rate_limiter._buckets.clear()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    from auth import require_firebase_user
    from main import app

    async def mock_firebase_user() -> dict[str, str]:
        return {"uid": "test-user", "email": "test@example.com"}

    app.dependency_overrides[require_firebase_user] = mock_firebase_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_tavily_search() -> MagicMock:
    mock_client = MagicMock()
    mock_client.search.return_value = {
        "results": [
            {
                "title": "Weekend Street Festival",
                "content": "Free outdoor festival this Saturday in Austin with live music.",
                "url": "https://example.com/festival",
            },
            {
                "title": "Indie Concert Night",
                "content": "Sunday evening concert, tickets from $20.",
                "url": "https://example.com/concert",
            },
        ]
    }
    return mock_client
