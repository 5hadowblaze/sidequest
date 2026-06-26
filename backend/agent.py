from __future__ import annotations

import json
import logging
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from google import genai
from google.genai import types
from langfuse import get_client, observe, propagate_attributes
from tavily import TavilyClient

from format_output import write_cited_md as persist_cited_md
from demo_data import build_demo_plan_result, is_demo_mode_forced
from models import CandidateItem, FilterStats, ItineraryItem, PlanRequest, PlanResult
from prometheux_filter import FilterResult, filter_candidates

logger = logging.getLogger(__name__)
GEMINI_MODEL = "gemini-3.1-pro-preview"


def _estimate_price(text: str, default: float = 25.0) -> float:
    lowered = text.lower()
    match = re.search(r"\$(\d+(?:\.\d+)?)", text)
    if match:
        return float(match.group(1))
    if "free" in lowered:
        return 0.0
    if "cheap" in lowered or "budget" in lowered:
        return min(default, 15.0)
    return default


def _extract_tags(text: str, request: PlanRequest, item_type: str) -> str:
    tokens = re.split(r"[,;/|]+", f"{request.diet},{request.activities}")
    found = [token.strip().lower() for token in tokens if token.strip()]
    haystack = text.lower()
    matched = [token for token in found if token in haystack]
    if item_type == "restaurant" and request.diet:
        matched.append(request.diet.split(",")[0].strip().lower())
    return ",".join(dict.fromkeys(matched)) or request.activities.lower()


def _normalize_tavily_results(
    results: list[dict[str, Any]],
    item_type: str,
    request: PlanRequest,
    id_prefix: str,
) -> list[CandidateItem]:
    normalized: list[CandidateItem] = []
    for idx, result in enumerate(results, start=1):
        title = str(result.get("title") or "Untitled")
        url = str(result.get("url") or "")
        snippet = str(result.get("content") or result.get("snippet") or "")
        combined = f"{title} {snippet}"
        normalized.append(
            CandidateItem(
                id=f"{id_prefix}_{idx}",
                type=item_type,  # type: ignore[arg-type]
                title=title,
                url=url,
                snippet=snippet,
                price_estimate=_estimate_price(combined),
                location=request.location,
                tags=_extract_tags(combined, request, item_type),
            )
        )
    return normalized


@observe(name="search-weekend-options", as_type="tool")
def search_weekend_options(request: PlanRequest) -> list[CandidateItem]:
    client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

    events_query = f"{request.location} weekend events activities {request.activities}"
    restaurants_query = (
        f"{request.location} restaurants {request.diet} budget under {int(request.budget)}"
    )

    def search_events() -> list[dict[str, Any]]:
        response = client.search(
            query=events_query,
            topic="news",
            time_range="week",
            max_results=8,
        )
        return response.get("results", [])

    def search_restaurants() -> list[dict[str, Any]]:
        response = client.search(
            query=restaurants_query,
            search_depth="advanced",
            max_results=8,
        )
        return response.get("results", [])

    with ThreadPoolExecutor(max_workers=2) as executor:
        events_future = executor.submit(search_events)
        restaurants_future = executor.submit(search_restaurants)
        events = events_future.result()
        restaurants = restaurants_future.result()

    candidates = _normalize_tavily_results(events, "event", request, "evt")
    candidates.extend(_normalize_tavily_results(restaurants, "restaurant", request, "rst"))
    logger.info("Tavily returned %d raw candidates (LLM search — not yet filtered)", len(candidates))
    return candidates


@observe(name="filter-with-prometheux", as_type="tool")
def filter_with_prometheux(
    candidates: list[CandidateItem], request: PlanRequest
) -> FilterResult:
    result = filter_candidates(candidates, request)
    logger.info(
        "Prometheux gate: %d → %d via %s (deterministic Vadalog — Gemini sees only verified rows)",
        result.candidates_in,
        result.candidates_out,
        result.filter_method,
    )
    return result


def _parse_gemini_json(text: str) -> list[dict[str, Any]]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    payload = json.loads(cleaned)
    if isinstance(payload, dict) and "itinerary" in payload:
        items = payload["itinerary"]
    elif isinstance(payload, list):
        items = payload
    else:
        raise ValueError("Gemini response missing itinerary array")
    if not isinstance(items, list):
        raise ValueError("Gemini itinerary is not a list")
    return items


def _fallback_itinerary(
    filtered: list[CandidateItem], request: PlanRequest
) -> list[ItineraryItem]:
    slots = ["Saturday 10:00", "Saturday 14:00", "Saturday 19:00", "Sunday 11:00", "Sunday 15:00"]
    items: list[ItineraryItem] = []
    for idx, candidate in enumerate(filtered[: len(slots)]):
        items.append(
            ItineraryItem(
                time=slots[idx],
                activity="Dining" if candidate.type == "restaurant" else "Activity",
                venue=candidate.title,
                cost=f"${candidate.price_estimate:.0f}",
                diet_access=request.diet if candidate.type == "restaurant" else (request.accessibility or "—"),
                source_url=candidate.url,
                source_index=idx + 1,
            )
        )
    return items


@observe(name="build-itinerary", as_type="generation")
def build_itinerary(
    filtered: list[CandidateItem], request: PlanRequest
) -> list[ItineraryItem]:
    if not filtered:
        return []

    # Gemini is formatting only — Prometheux/Vadalog already verified every row below.
    try:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        rows = [item.model_dump() for item in filtered]
        prompt = f"""You are formatting a verified weekend itinerary.

User constraints:
- Location: {request.location}
- Budget: ${request.budget}
- Diet: {request.diet}
- Activities: {request.activities}
- Accessibility: {request.accessibility or "none specified"}

Prometheux-verified rows (ONLY use these — do not invent venues):
{json.dumps(rows, indent=2)}

Return JSON only:
{{
  "itinerary": [
    {{
      "time": "Saturday 10:00",
      "activity": "short label",
      "venue": "exact title from a row",
      "cost": "$25",
      "diet_access": "diet or accessibility note",
      "source_url": "exact url from row",
      "source_index": 1
    }}
  ]
}}

Rules:
- Do not invent venues, URLs, or prices.
- Use only the Prometheux-verified rows above.
- Assign source_index matching the row order in the verified list (1-based).
- Include 3-6 items spanning Saturday and Sunday when enough rows exist.
"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        text = response.text or ""
        raw_items = _parse_gemini_json(text)
        return [ItineraryItem.model_validate(item) for item in raw_items]
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Gemini itinerary parse failed (%s) — using fallback slots", exc)
        return _fallback_itinerary(filtered, request)
    except Exception as exc:
        logger.warning("Gemini itinerary build failed (%s) — using fallback slots", exc)
        return _fallback_itinerary(filtered, request)


@observe(name="write-cited-md", as_type="tool")
def write_cited_md(
    itinerary: list[ItineraryItem],
    filtered: list[CandidateItem],
    filter_stats: FilterStats,
) -> str:
    path = persist_cited_md(itinerary, filtered, filter_stats)
    return str(path)


def _current_trace_id() -> str | None:
    try:
        client = get_client()
        if hasattr(client, "get_current_trace_id"):
            return client.get_current_trace_id()  # type: ignore[attr-defined]
    except Exception:
        pass
    return None


@observe(name="weekend-planner", as_type="agent")
def run_weekend_planner(request: PlanRequest) -> PlanResult:
    if is_demo_mode_forced():
        logger.info("USE_DEMO_DATA=true — serving demo plan only")
        return build_demo_plan_result(request)

    session_id = str(uuid.uuid4())
    metadata = {
        "location": request.location[:200],
        "budget": str(int(request.budget)),
    }

    with propagate_attributes(session_id=session_id, metadata=metadata):
        try:
            raw = search_weekend_options(request)
        except Exception as exc:
            logger.warning("Tavily plan search failed (%s) — demo fallback", exc)
            return build_demo_plan_result(request)

        try:
            filter_result = filter_with_prometheux(raw, request)
        except Exception as exc:
            logger.warning("Prometheux plan filter failed (%s) — demo fallback", exc)
            return build_demo_plan_result(request)

        filtered = filter_result.candidates
        try:
            itinerary = build_itinerary(filtered, request)
        except Exception as exc:
            logger.warning("Itinerary build failed (%s) — demo fallback", exc)
            return build_demo_plan_result(request)

        filter_stats = FilterStats(
            candidates_in=filter_result.candidates_in,
            candidates_out=filter_result.candidates_out,
            filter_method=filter_result.filter_method,
            concept_name=filter_result.concept_name,
        )
        cited_path = write_cited_md(itinerary, filtered, filter_stats)

    return PlanResult(
        itinerary=itinerary,
        cited_path=cited_path,
        trace_id=_current_trace_id(),
        filter_stats=filter_stats,
    )
