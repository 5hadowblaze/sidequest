from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from models import DiscoverResponse, PlanResult


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_discover_rejects_empty_location(client: TestClient) -> None:
    response = client.get("/discover", params={"location": "   "})
    assert response.status_code == 400
    assert "location" in response.json()["detail"].lower()


def test_discover_without_tavily_key_returns_demo_events(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    monkeypatch.delenv("USE_DEMO_DATA", raising=False)
    response = client.get("/discover", params={"location": "Austin"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["location"] == "Austin"
    assert payload["source"] == "demo"
    assert len(payload["events"]) >= 1
    assert payload["events"][0]["id"].startswith("demo_")


@patch("discover.TavilyClient")
def test_discover_with_tavily_mock(
    mock_tavily_cls: MagicMock,
    client: TestClient,
    mock_tavily_search: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    monkeypatch.delenv("USE_DEMO_DATA", raising=False)
    mock_tavily_cls.return_value = mock_tavily_search
    response = client.get("/discover", params={"location": "Austin, TX"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "tavily"
    assert len(payload["events"]) == 2
    assert payload["events"][0]["title"] == "Weekend Street Festival"
    mock_tavily_search.search.assert_called_once()


def test_discover_with_budget_requires_pmpx_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("PMTX_TOKEN", raising=False)
    response = client.get(
        "/discover",
        params={"location": "Austin", "budget": 50},
    )
    assert response.status_code == 503
    assert "PMTX_TOKEN" in response.json()["detail"]


def test_discover_with_budget_and_invalid_calendar_slots(
    client: TestClient, api_env: None
) -> None:
    response = client.get(
        "/discover",
        params={
            "location": "Austin",
            "budget": 50,
            "calendar_slots": "not-json",
        },
    )
    assert response.status_code == 400
    assert "calendar_slots" in response.json()["detail"].lower()


@patch("main.discover_local_events")
def test_discover_prometheux_config_error_maps_to_503(
    mock_discover: MagicMock,
    client: TestClient,
    api_env: None,
) -> None:
    from prometheux_filter import PrometheuxConfigError

    mock_discover.side_effect = PrometheuxConfigError("missing token")
    response = client.get("/discover", params={"location": "Austin"})
    assert response.status_code == 503


@patch("main.discover_local_events")
def test_discover_prometheux_engine_busy_returns_retry_after(
    mock_discover: MagicMock,
    client: TestClient,
    api_env: None,
) -> None:
    from prometheux_filter import PrometheuxEngineBusyError

    mock_discover.side_effect = PrometheuxEngineBusyError(
        "engine busy after retries",
        retry_after_seconds=30,
    )
    response = client.get(
        "/discover",
        params={"location": "Austin", "budget": 100, "diet": "vegan"},
    )
    assert response.status_code == 503
    assert response.headers.get("retry-after") == "30"


def test_plan_demo_mode_without_api_keys(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for key in ("GEMINI_API_KEY", "TAVILY_API_KEY", "PMTX_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("USE_DEMO_DATA", "true")
    response = client.post(
        "/plan",
        json={
            "location": "Austin, TX",
            "budget": 100,
            "diet": "vegetarian",
            "activities": "music, outdoor",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["itinerary"]) >= 3
    assert payload["filter_stats"]["filter_method"] == "demo"


def test_plan_missing_env_vars_returns_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for key in ("GEMINI_API_KEY", "TAVILY_API_KEY", "PMTX_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    response = client.post(
        "/plan",
        json={
            "location": "Austin",
            "budget": 100,
            "diet": "vegetarian",
            "activities": "music",
        },
    )
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert "GEMINI_API_KEY" in detail
    assert "TAVILY_API_KEY" in detail
    assert "PMTX_TOKEN" in detail


@patch("main.run_weekend_planner")
def test_plan_success_with_mocked_planner(
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
    response = client.post(
        "/plan",
        json={
            "location": "Austin, TX",
            "budget": 100,
            "diet": "vegetarian",
            "activities": "music, outdoor",
            "calendar_slots": [{"date": "saturday", "period": "afternoon"}],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["itinerary"]) == 2
    assert payload["cited_path"] == "/tmp/cited.md"
    assert payload["filter_stats"]["candidates_in"] == 3
    mock_planner.assert_called_once()


@patch("agent.build_itinerary")
@patch("prometheux_filter._filter_with_sdk")
@patch("agent.TavilyClient")
def test_plan_full_stack_with_mocked_deps(
    mock_tavily_cls: MagicMock,
    mock_filter_sdk: MagicMock,
    mock_build_itinerary: MagicMock,
    client: TestClient,
    api_env: None,
    sample_candidates,
    sample_itinerary,
) -> None:
    mock_client = MagicMock()
    mock_client.search.side_effect = [
        {
            "results": [
                {
                    "title": "Saturday Jazz in Austin",
                    "content": "Live jazz saturday evening downtown Austin",
                    "url": "https://example.com/jazz",
                }
            ]
        },
        {
            "results": [
                {
                    "title": "Vegan Garden Austin",
                    "content": "Vegetarian and vegan plates under budget",
                    "url": "https://example.com/vegan",
                }
            ]
        },
    ]
    mock_tavily_cls.return_value = mock_client

    mock_filter_sdk.return_value = sample_candidates[:2]
    mock_build_itinerary.return_value = sample_itinerary

    response = client.post(
        "/plan",
        json={
            "location": "Austin, TX",
            "budget": 100,
            "diet": "vegetarian",
            "activities": "music",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["itinerary"]) == 2
    assert payload["filter_stats"]["candidates_out"] >= 1
    assert mock_tavily_cls.called
    assert mock_filter_sdk.called
    assert mock_build_itinerary.called
