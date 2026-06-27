from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from discover import _safe_https_url, discover_local_events, parse_calendar_slots
from models import CandidateItem, UserConstraintContext
from prometheux_filter import FilterResult, PrometheuxSDKError


def test_parse_calendar_slots_empty() -> None:
    assert parse_calendar_slots(None) == []
    assert parse_calendar_slots("") == []
    assert parse_calendar_slots("  ") == []


def test_parse_calendar_slots_valid_json() -> None:
    raw = '[{"date": "saturday", "period": "afternoon"}]'
    slots = parse_calendar_slots(raw)
    assert slots == [{"date": "saturday", "period": "afternoon"}]


def test_parse_calendar_slots_invalid_json() -> None:
    with pytest.raises(ValueError, match="valid JSON"):
        parse_calendar_slots("{bad")


def test_parse_calendar_slots_not_array() -> None:
    with pytest.raises(ValueError, match="JSON array"):
        parse_calendar_slots('{"date": "saturday"}')


def test_safe_https_url_blocks_unsafe_schemes() -> None:
    fallback = "https://example.com/fallback"
    assert _safe_https_url("https://event.com/tickets", fallback) == "https://event.com/tickets"
    assert _safe_https_url("javascript:alert(1)", fallback) == fallback
    assert _safe_https_url("//evil.com", fallback) == fallback
    assert _safe_https_url("http://insecure.com", fallback) == fallback
    assert _safe_https_url("", fallback) == fallback


def test_discover_local_events_requires_location() -> None:
    with pytest.raises(ValueError, match="location is required"):
        discover_local_events("  ")


def test_discover_local_events_mock_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    response = discover_local_events("Austin, TX")
    assert response.location == "Austin, TX"
    assert response.source == "mock"
    assert len(response.events) >= 8
    assert response.events[0].lat is not None
    assert response.events[0].lng is not None


@patch("discover.TavilyClient")
def test_discover_local_events_with_tavily(
    mock_tavily_cls: MagicMock,
    mock_tavily_search: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    mock_tavily_cls.return_value = mock_tavily_search
    response = discover_local_events("Austin, TX")
    assert response.source == "tavily"
    assert len(response.events) == 2
    assert response.center_lat is not None
    assert response.center_lng is not None
    assert response.events[0].title == "Weekend Street Festival"


@patch("discover.TavilyClient")
def test_discover_local_events_tavily_empty_falls_back_to_mock(
    mock_tavily_cls: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    mock_client = MagicMock()
    mock_client.search.return_value = {"results": []}
    mock_tavily_cls.return_value = mock_client
    response = discover_local_events("Seattle")
    assert response.source == "mock"
    assert len(response.events) >= 1


@patch("discover.filter_candidates")
@patch("discover.TavilyClient")
def test_discover_local_events_with_context_filter(
    mock_tavily_cls: MagicMock,
    mock_filter: MagicMock,
    mock_tavily_search: MagicMock,
    sample_context: UserConstraintContext,
    sample_candidates,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    mock_tavily_cls.return_value = mock_tavily_search
    mock_filter.return_value = FilterResult(
        candidates=[
            CandidateItem(
                id="disc_1",
                type="event",
                title="Weekend Street Festival",
                url="https://example.com/festival",
                snippet="Free outdoor festival",
                price_estimate=0.0,
                location="Austin, TX",
                tags="festival,music",
                date_hint="Saturday",
            )
        ],
        candidates_in=2,
        candidates_out=1,
        filter_method="sdk",
        passed_rules_by_id={"disc_1": ["budget_ok", "loc_ok"]},
    )
    response = discover_local_events("Austin, TX", context=sample_context)
    assert response.source == "tavily"
    assert len(response.events) == 1
    assert response.events[0].prometheux_verified is True
    assert response.filter_stats is not None
    assert response.filter_stats.candidates_in == 2
    mock_filter.assert_called_once()


@patch("discover.TavilyClient")
def test_discover_annotate_unfiltered_without_prometheux(
    mock_tavily_cls: MagicMock,
    mock_tavily_search: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    mock_tavily_cls.return_value = mock_tavily_search
    response = discover_local_events("Austin, TX", context=None)
    assert response.filter_stats is None
    assert all(not event.prometheux_verified for event in response.events)


@patch("discover.filter_candidates")
@patch("discover.TavilyClient")
def test_discover_prometheux_sdk_error_propagates(
    mock_tavily_cls: MagicMock,
    mock_filter: MagicMock,
    mock_tavily_search: MagicMock,
    sample_context: UserConstraintContext,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-tavily-key")
    mock_tavily_cls.return_value = mock_tavily_search
    mock_filter.side_effect = PrometheuxSDKError("sdk failed")
    with pytest.raises(PrometheuxSDKError):
        discover_local_events("Austin", context=sample_context)
