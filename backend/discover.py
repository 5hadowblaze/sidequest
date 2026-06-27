from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import Any

from tavily import TavilyClient

from event_images import image_for_event
from models import (
    CandidateItem,
    DiscoverEvent,
    DiscoverResponse,
    FilterStats,
    UserConstraintContext,
)
from prometheux_filter import (
    PrometheuxConfigError,
    PrometheuxEngineBusyError,
    PrometheuxSDKError,
    filter_candidates,
)

logger = logging.getLogger(__name__)

CITY_COORDS: dict[str, tuple[float, float]] = {
    "austin": (30.2672, -97.7431),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.006),
    "los angeles": (34.0522, -118.2437),
    "chicago": (41.8781, -87.6298),
    "seattle": (47.6062, -122.3321),
    "boston": (42.3601, -71.0589),
    "denver": (39.7392, -104.9903),
    "miami": (25.7617, -80.1918),
    "portland": (45.5152, -122.6784),
    "london": (51.5074, -0.1278),
    "paris": (48.8566, 2.3522),
    "tokyo": (35.6762, 139.6503),
}

CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("festival", "Festival"),
    ("conference", "Conference"),
    ("popup", "Popup"),
    ("market", "Market"),
    ("concert", "Concert"),
    ("pub", "Pub hangout"),
    ("meetup", "Meetup"),
    ("travel", "Travel"),
    ("food", "Food & drink"),
    ("art", "Art"),
    ("sport", "Sports"),
    ("tech", "Tech"),
]


def _city_center(location: str) -> tuple[float, float]:
    lowered = location.lower().strip()
    for city, coords in CITY_COORDS.items():
        if city in lowered:
            return coords
    digest = hashlib.sha256(location.encode()).hexdigest()
    lat_offset = (int(digest[:4], 16) / 65535 - 0.5) * 0.08
    lng_offset = (int(digest[4:8], 16) / 65535 - 0.5) * 0.08
    return (37.7749 + lat_offset, -122.4194 + lng_offset)


def _jitter_coords(base: tuple[float, float], seed: str) -> tuple[float, float]:
    digest = hashlib.sha256(seed.encode()).hexdigest()
    lat_j = (int(digest[:4], 16) / 65535 - 0.5) * 0.06
    lng_j = (int(digest[4:8], 16) / 65535 - 0.5) * 0.06
    return (base[0] + lat_j, base[1] + lng_j)


def _estimate_price(text: str) -> tuple[float | None, str]:
    lowered = text.lower()
    match = re.search(r"\$(\d+(?:\.\d+)?)", text)
    if match:
        value = float(match.group(1))
        return value, f"${value:.0f}"
    if "free" in lowered:
        return 0.0, "Free"
    if "cheap" in lowered or "budget" in lowered:
        return 15.0, "From $15"
    return None, "See details"


def _infer_category(text: str) -> str:
    lowered = text.lower()
    for keyword, label in CATEGORY_KEYWORDS:
        if keyword in lowered:
            return label
    return "Local event"


def _extract_date_hint(text: str) -> str | None:
    patterns = [
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b",
        r"\b(?:Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)\b[^.]{0,30}",
        r"\bthis weekend\b",
        r"\btonight\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return "This weekend"


def _extract_tags(text: str, context: UserConstraintContext | None) -> str:
    if not context:
        return _infer_category(text).lower()
    tokens = re.split(r"[,;/|]+", f"{context.diet},{context.activities}")
    found = [token.strip().lower() for token in tokens if token.strip()]
    haystack = text.lower()
    matched = [token for token in found if token in haystack]
    category = _infer_category(text).lower()
    if category not in matched:
        matched.append(category)
    return ",".join(dict.fromkeys(matched)) or category


def _normalize_result(
    result: dict[str, Any],
    location: str,
    idx: int,
    context: UserConstraintContext | None = None,
) -> DiscoverEvent:
    title = str(result.get("title") or "Local event")
    snippet = str(result.get("content") or result.get("snippet") or "")
    url = str(result.get("url") or "")
    combined = f"{title} {snippet}"
    category = _infer_category(combined)
    event_id = f"disc_{idx}"
    lat, lng = _jitter_coords(_city_center(location), event_id + title)
    price, price_label = _estimate_price(combined)
    return DiscoverEvent(
        id=event_id,
        title=title,
        description=snippet[:280] if snippet else f"Happening near {location} this weekend.",
        category=category,
        image_url=image_for_event(title, category),
        price_estimate=price,
        price_label=price_label,
        location=location,
        lat=lat,
        lng=lng,
        url=url or f"https://www.google.com/search?q={title.replace(' ', '+')}",
        date_hint=_extract_date_hint(combined),
    )


def _event_to_candidate(event: DiscoverEvent, context: UserConstraintContext | None) -> CandidateItem:
    combined = f"{event.title} {event.description}"
    return CandidateItem(
        id=event.id,
        type="event",
        title=event.title,
        url=event.url,
        snippet=event.description,
        price_estimate=float(event.price_estimate or 25.0),
        location=event.location,
        tags=_extract_tags(combined, context),
        date_hint=event.date_hint or "",
    )


def _candidate_to_event(
    candidate: CandidateItem,
    source: DiscoverEvent,
    passed_rules: list[str],
) -> DiscoverEvent:
    return source.model_copy(
        update={
            "title": candidate.title or source.title,
            "url": candidate.url or source.url,
            "price_estimate": candidate.price_estimate,
            "passed_rules": passed_rules,
            "prometheux_verified": True,
            "filter_method": "sdk",
            "match_score": len(passed_rules),
        }
    )


def _mock_events(location: str) -> list[DiscoverEvent]:
    base = _city_center(location)
    samples = [
        ("Rooftop Jazz & Wine Popup", "Popup", "Sunset live music with local vintners on a downtown rooftop."),
        ("Indie Dev Conference Day Pass", "Conference", "Talks, demos, and hallway track for builders this Saturday."),
        ("Neighborhood Street Festival", "Festival", "Food trucks, artisan stalls, and family activities all weekend."),
        ("Craft Beer Pub Crawl", "Pub hangout", "Guided tasting route through three beloved local pubs."),
        ("Weekend Makers Market", "Market", "Pop-up stalls featuring ceramics, prints, and small-batch goods."),
        ("Outdoor Film Night", "Concert", "Classic movies under the stars in the city park."),
        ("Day Trip: Coastal Hike Shuttle", "Travel", "Organized shuttle and guided coastal trail experience."),
        ("Gallery Opening: New Voices", "Art", "Opening reception with emerging local artists and bites."),
    ]
    events: list[DiscoverEvent] = []
    for idx, (title, category, description) in enumerate(samples, start=1):
        event_id = f"mock_{idx}"
        lat, lng = _jitter_coords(base, event_id)
        price, price_label = _estimate_price(description)
        events.append(
            DiscoverEvent(
                id=event_id,
                title=title,
                description=description,
                category=category,
                image_url=image_for_event(title, category),
                price_estimate=price,
                price_label=price_label,
                location=location,
                lat=lat,
                lng=lng,
                url=f"https://example.com/events/{event_id}",
                date_hint="This weekend",
            )
        )
    return events



def _fetch_tavily_events(
    location: str,
    context: UserConstraintContext | None,
) -> list[DiscoverEvent]:
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not set")

    client = TavilyClient(api_key=api_key)
    query = (
        f"{location} weekend events popups conferences festivals pub hangouts "
        "markets concerts meetups travel this week"
    )
    response = client.search(
        query=query,
        topic="news",
        time_range="week",
        max_results=12,
    )
    results = response.get("results", [])
    return [
        _normalize_result(result, location, idx, context)
        for idx, result in enumerate(results, start=1)
    ]


def discover_local_events(
    location: str,
    context: UserConstraintContext | None = None,
) -> DiscoverResponse:
    location = location.strip()
    if not location:
        raise ValueError("location is required")

    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        center = _city_center(location)
        return DiscoverResponse(
            location=location,
            events=_mock_events(location),
            source="mock",
            center_lat=center[0],
            center_lng=center[1],
        )

    events: list[DiscoverEvent] = []
    source = "tavily"

    try:
        events = _fetch_tavily_events(location, context)
    except Exception as exc:
        logger.warning("Tavily discover failed (%s) — falling back to mock events", exc)
        center = _city_center(location)
        return DiscoverResponse(
            location=location,
            events=_mock_events(location),
            source="mock",
            center_lat=center[0],
            center_lng=center[1],
        )

    if not events:
        center = _city_center(location)
        return DiscoverResponse(
            location=location,
            events=_mock_events(location),
            source="mock",
            center_lat=center[0],
            center_lng=center[1],
        )

    center = _city_center(location)
    filter_stats: FilterStats | None = None

    if context is not None:
        candidates = [_event_to_candidate(event, context) for event in events]
        try:
            filter_result = filter_candidates(candidates, context)
            source_by_id = {event.id: event for event in events}
            events = [
                _candidate_to_event(
                    candidate,
                    source_by_id[candidate.id],
                    filter_result.passed_rules_by_id.get(candidate.id, []),
                )
                for candidate in filter_result.candidates
                if candidate.id in source_by_id
            ]
            filter_stats = FilterStats(
                candidates_in=filter_result.candidates_in,
                candidates_out=filter_result.candidates_out,
                filter_method=filter_result.filter_method,
                concept_name=filter_result.concept_name,
            )
        except (PrometheuxConfigError, PrometheuxEngineBusyError, PrometheuxSDKError):
            raise
        except Exception as exc:
            raise PrometheuxSDKError(f"Prometheux discover filter failed: {exc}") from exc

    return DiscoverResponse(
        location=location,
        events=events,
        source=source,
        center_lat=center[0],
        center_lng=center[1],
        filter_stats=filter_stats,
    )


def parse_calendar_slots(raw: str | None) -> list[dict[str, str]]:
    if not raw or not raw.strip():
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("calendar_slots must be valid JSON") from exc
    if not isinstance(payload, list):
        raise ValueError("calendar_slots must be a JSON array")
    return payload
