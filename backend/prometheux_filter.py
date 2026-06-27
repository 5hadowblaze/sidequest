from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Generator, Literal, TypeVar

from models import (
    CalendarSlot,
    CandidateItem,
    PlanRequest,
    UserConstraintContext,
)

logger = logging.getLogger(__name__)

_prometheux_lock = threading.Lock()
_last_prometheux_job_end: float = 0.0
_saved_program_hash: str | None = None
_saved_run_concept_name: str | None = None

MAX_PROMETHEUX_RETRIES = 8
MAX_PROMETHEUX_TOTAL_SECONDS = 60.0
ENGINE_BUSY_BASE_DELAY_S = 2.0
ENGINE_BUSY_MAX_DELAY_S = 32.0
MIN_GAP_BETWEEN_JOBS_S = 2.0

FilterMethod = Literal["sdk"]
CONCEPT_NAME = "weekend_planner_matches"
OUTPUT_PREDICATE = "matches"

# Vadalog ontology: Tavily facts + constraint facts → deterministic `matches` rows.
# Gemini NEVER sees candidates that fail these rules (see agent.build_itinerary).
VADALOG_TEMPLATE = """
{facts}

max_budget({budget}).
target_location("{location}").
{constraint_flags}
{diet_facts}
{activity_facts}
{accessibility_facts}
{calendar_facts}

% --- Budget ceiling ---
budget_ok(Price) :- max_budget(B), Price <= B.

% --- Location: city/area token in location field OR title ---
loc_ok(Loc, Title) :- target_location(L), string_contains(Loc, L).
loc_ok(Loc, Title) :- target_location(L), string_contains(Title, L).

% --- Diet keywords (restaurants/events): at least one token when constraints exist ---
diet_match(Tags, Title, Snippet) :- required_diet_token(D), string_contains(Tags, D).
diet_match(Tags, Title, Snippet) :- required_diet_token(D), string_contains(Title, D).
diet_match(Tags, Title, Snippet) :- required_diet_token(D), string_contains(Snippet, D).
diet_ok(Tags, Title, Snippet) :- not has_diet_constraints.
diet_ok(Tags, Title, Snippet) :- has_diet_constraints, diet_match(Tags, Title, Snippet).

% --- Activity tags: at least one token when constraints exist ---
activity_match(Tags, Title, Snippet) :- required_activity_token(A), string_contains(Tags, A).
activity_match(Tags, Title, Snippet) :- required_activity_token(A), string_contains(Title, A).
activity_match(Tags, Title, Snippet) :- required_activity_token(A), string_contains(Snippet, A).
activity_ok(Tags, Title, Snippet) :- not has_activity_constraints.
activity_ok(Tags, Title, Snippet) :- has_activity_constraints, activity_match(Tags, Title, Snippet).

% --- Accessibility keywords: at least one token when constraints exist ---
access_match(Tags, Title, Snippet) :- required_access_token(A), string_contains(Tags, A).
access_match(Tags, Title, Snippet) :- required_access_token(A), string_contains(Title, A).
access_match(Tags, Title, Snippet) :- required_access_token(A), string_contains(Snippet, A).
access_ok(Tags, Title, Snippet) :- not has_access_constraints.
access_ok(Tags, Title, Snippet) :- has_access_constraints, access_match(Tags, Title, Snippet).

% --- Calendar free slots (morning / afternoon / evening) ---
period_mentioned(DateHint, Title, Snippet) :- string_contains(DateHint, "morning").
period_mentioned(DateHint, Title, Snippet) :- string_contains(DateHint, "afternoon").
period_mentioned(DateHint, Title, Snippet) :- string_contains(DateHint, "evening").
period_mentioned(DateHint, Title, Snippet) :- string_contains(DateHint, "night").
period_mentioned(DateHint, Title, Snippet) :- string_contains(DateHint, "tonight").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Title, "morning").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Title, "afternoon").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Title, "evening").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Title, "night").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Snippet, "morning").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Snippet, "afternoon").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Snippet, "evening").
period_mentioned(DateHint, Title, Snippet) :- string_contains(Snippet, "night").

slot_day_match(DateHint, Title, Snippet, SlotDate) :- free_slot(SlotDate, _), string_contains(DateHint, SlotDate).
slot_day_match(DateHint, Title, Snippet, SlotDate) :- free_slot(SlotDate, _), string_contains(Title, SlotDate).
slot_day_match(DateHint, Title, Snippet, SlotDate) :- free_slot(SlotDate, _), string_contains(Snippet, SlotDate).
slot_day_match(DateHint, Title, Snippet, "saturday") :- string_contains(DateHint, "sat").
slot_day_match(DateHint, Title, Snippet, "saturday") :- string_contains(Title, "sat").
slot_day_match(DateHint, Title, Snippet, "sunday") :- string_contains(DateHint, "sun").
slot_day_match(DateHint, Title, Snippet, "sunday") :- string_contains(Title, "sun").
slot_day_match(DateHint, Title, Snippet, SlotDate) :- string_contains(DateHint, "weekend"), free_slot(SlotDate, _).

slot_period_match(DateHint, Title, Snippet, "morning") :- string_contains(DateHint, "morning").
slot_period_match(DateHint, Title, Snippet, "morning") :- string_contains(Title, "morning").
slot_period_match(DateHint, Title, Snippet, "morning") :- string_contains(Snippet, "morning").
slot_period_match(DateHint, Title, Snippet, "afternoon") :- string_contains(DateHint, "afternoon").
slot_period_match(DateHint, Title, Snippet, "afternoon") :- string_contains(Title, "afternoon").
slot_period_match(DateHint, Title, Snippet, "afternoon") :- string_contains(Snippet, "afternoon").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(DateHint, "evening").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(DateHint, "night").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(DateHint, "tonight").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(Title, "evening").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(Title, "night").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(Snippet, "evening").
slot_period_match(DateHint, Title, Snippet, "evening") :- string_contains(Snippet, "night").

event_fits_slot(Id) :-
  candidate(Id, _, Title, _, _, _, _, Snippet, DateHint),
  free_slot(SlotDate, Period),
  slot_day_match(DateHint, Title, Snippet, SlotDate),
  slot_period_match(DateHint, Title, Snippet, Period).

event_fits_slot(Id) :-
  candidate(Id, _, Title, _, _, _, _, Snippet, DateHint),
  free_slot(SlotDate, Period),
  slot_day_match(DateHint, Title, Snippet, SlotDate),
  not period_mentioned(DateHint, Title, Snippet).

slot_ok(Id, Title, Snippet, DateHint) :- not has_calendar_constraints.
slot_ok(Id, Title, Snippet, DateHint) :- has_calendar_constraints, event_fits_slot(Id).

% --- Final gate: all constraint dimensions must pass ---
matches(Id, Type, Title, Url, Price, Loc, Tags) :-
  candidate(Id, Type, Title, Url, Price, Loc, Tags, Snippet, DateHint),
  budget_ok(Price),
  loc_ok(Loc, Title),
  diet_ok(Tags, Title, Snippet),
  activity_ok(Tags, Title, Snippet),
  access_ok(Tags, Title, Snippet),
  slot_ok(Id, Title, Snippet, DateHint).

@output("matches").
"""


class PrometheuxConfigError(Exception):
    """Raised when Prometheux environment variables are missing or invalid."""


class PrometheuxSDKError(Exception):
    """Raised when the prometheux_chain SDK call fails."""


class PrometheuxEngineBusyError(PrometheuxSDKError):
    """Raised when the Prometheux engine stays busy after retries."""

    def __init__(self, message: str, *, retry_after_seconds: int = 30) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


@dataclass(frozen=True)
class FilterResult:
    candidates: list[CandidateItem]
    candidates_in: int
    candidates_out: int
    filter_method: FilterMethod
    passed_rules_by_id: dict[str, list[str]] = field(default_factory=dict)
    concept_name: str = CONCEPT_NAME


def context_from_plan(request: PlanRequest) -> UserConstraintContext:
    return UserConstraintContext(
        budget=request.budget,
        diet=request.diet,
        activities=request.activities,
        accessibility=request.accessibility,
        home_location=request.location,
        calendar_slots=list(request.calendar_slots),
    )


_MAX_VADALOG_FIELD_LEN = 200
_MAX_VADALOG_SNIPPET_LEN = 400


def sanitize_vadalog_string(value: str, *, max_len: int = _MAX_VADALOG_FIELD_LEN) -> str:
    """Return content safe to embed inside Vadalog double-quoted string literals."""
    if not value:
        return ""
    text = str(value)
    text = text.replace("\r\n", " ").replace("\r", " ").replace("\n", " ").replace("\t", " ")
    # Vadalog literals do not support backslash escapes; strip/replace problematic chars.
    text = text.replace("\\", " ").replace('"', "'")
    text = "".join(ch if ord(ch) >= 32 else " " for ch in text)
    text = re.sub(r" +", " ", text).strip()
    if len(text) > max_len:
        text = text[:max_len].rstrip()
    return text


def _tokenize_constraints(value: str) -> list[str]:
    return [part.strip().lower() for part in re.split(r"[,;/|]+", value) if part.strip()]


def _location_token(location: str) -> str:
    """Use the primary city token for substring matching."""
    primary = location.split(",")[0].strip().lower()
    return primary or location.strip().lower()


def _normalize_slot_date(date: str) -> str:
    return date.strip().lower()


def _slot_rule_name(slot: CalendarSlot) -> str:
    date_token = re.sub(r"[^a-z0-9]+", "_", _normalize_slot_date(slot.date)).strip("_")
    return f"free_slot_{date_token}_{slot.period}"


def _build_candidate_facts(candidates: list[CandidateItem]) -> str:
    lines: list[str] = []
    for item in candidates:
        lines.append(
            f'candidate("{sanitize_vadalog_string(item.id)}", '
            f'"{sanitize_vadalog_string(item.type)}", '
            f'"{sanitize_vadalog_string(item.title)}", '
            f'"{sanitize_vadalog_string(item.url)}", '
            f"{item.price_estimate}, "
            f'"{sanitize_vadalog_string(item.location)}", '
            f'"{sanitize_vadalog_string(item.tags)}", '
            f'"{sanitize_vadalog_string(item.snippet, max_len=_MAX_VADALOG_SNIPPET_LEN)}", '
            f'"{sanitize_vadalog_string(item.date_hint)}").'
        )
    return "\n".join(lines)


def _build_token_facts(predicate: str, tokens: list[str]) -> str:
    return "\n".join(
        f'{predicate}("{sanitize_vadalog_string(token)}").' for token in tokens
    )


def _build_calendar_facts(slots: list[CalendarSlot]) -> tuple[str, list[str]]:
    if not slots:
        return "", []
    lines = [
        f'free_slot("{sanitize_vadalog_string(_normalize_slot_date(slot.date))}", '
        f'"{sanitize_vadalog_string(slot.period)}").'
        for slot in slots
    ]
    return "\n".join(lines), ["has_calendar_constraints."]


def build_vadalog_program(
    candidates: list[CandidateItem], context: UserConstraintContext
) -> str:
    diet_tokens = _tokenize_constraints(context.diet)
    activity_tokens = _tokenize_constraints(context.activities)
    accessibility_tokens = (
        _tokenize_constraints(context.accessibility) if context.accessibility else []
    )

    constraint_flags: list[str] = []
    if diet_tokens:
        constraint_flags.append("has_diet_constraints.")
    if activity_tokens:
        constraint_flags.append("has_activity_constraints.")
    if accessibility_tokens:
        constraint_flags.append("has_access_constraints.")

    calendar_facts, calendar_flags = _build_calendar_facts(context.calendar_slots)
    constraint_flags.extend(calendar_flags)

    return VADALOG_TEMPLATE.format(
        facts=_build_candidate_facts(candidates),
        budget=int(context.budget),
        location=sanitize_vadalog_string(_location_token(context.home_location)),
        constraint_flags="\n".join(constraint_flags),
        diet_facts=_build_token_facts("required_diet_token", diet_tokens),
        activity_facts=_build_token_facts("required_activity_token", activity_tokens),
        accessibility_facts=_build_token_facts(
            "required_access_token", accessibility_tokens
        ),
        calendar_facts=calendar_facts,
    )


def _text_blob(*parts: str) -> str:
    return " ".join(parts).lower()


def _matches_token(blob: str, token: str) -> bool:
    return token.lower() in blob


def _matches_location(blob: str, location: str) -> bool:
    token = _location_token(location)
    return token in blob


def _period_mentioned(blob: str) -> bool:
    return any(
        keyword in blob
        for keyword in ("morning", "afternoon", "evening", "night", "tonight")
    )


def _slot_day_matches(blob: str, slot_date: str) -> bool:
    normalized = _normalize_slot_date(slot_date)
    if normalized in blob:
        return True
    if normalized == "saturday" and "sat" in blob:
        return True
    if normalized == "sunday" and "sun" in blob:
        return True
    if "weekend" in blob:
        return True
    return False


def _slot_period_matches(blob: str, period: str) -> bool:
    if period == "morning":
        return "morning" in blob
    if period == "afternoon":
        return "afternoon" in blob
    if period == "evening":
        return any(keyword in blob for keyword in ("evening", "night", "tonight"))
    return False


def _event_fits_slot(item: CandidateItem, slot: CalendarSlot) -> bool:
    blob = _text_blob(item.date_hint, item.title, item.snippet)
    if not _slot_day_matches(blob, slot.date):
        return False
    if not _period_mentioned(blob):
        return True
    return _slot_period_matches(blob, slot.period)


def compute_passed_rules(
    item: CandidateItem, context: UserConstraintContext
) -> list[str]:
    blob = _text_blob(item.tags, item.title, item.snippet)
    loc_blob = _text_blob(item.location, item.title)
    rules: list[str] = []

    if item.price_estimate <= context.budget:
        rules.append("budget_ok")

    if _matches_location(loc_blob, context.home_location):
        rules.append("loc_ok")

    diet_tokens = _tokenize_constraints(context.diet)
    if not diet_tokens or any(_matches_token(blob, token) for token in diet_tokens):
        rules.append("diet_match")

    activity_tokens = _tokenize_constraints(context.activities)
    if not activity_tokens or any(_matches_token(blob, token) for token in activity_tokens):
        rules.append("activity_match")

    access_tokens = (
        _tokenize_constraints(context.accessibility) if context.accessibility else []
    )
    if not access_tokens or any(_matches_token(blob, token) for token in access_tokens):
        rules.append("access_match")

    for slot in context.calendar_slots:
        if _event_fits_slot(item, slot):
            rules.append(_slot_rule_name(slot))

    if not context.calendar_slots:
        rules.append("slot_ok")

    return rules


def _parse_matches_rows(payload: Any) -> list[dict[str, Any]]:
    if payload is None:
        return []

    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        for key in ("matches", "results", "data", "output"):
            if key in payload and isinstance(payload[key], list):
                rows = payload[key]
                break
        else:
            rows = [payload]
    else:
        return []

    parsed: list[dict[str, Any]] = []
    for row in rows:
        if isinstance(row, dict):
            parsed.append(row)
        elif isinstance(row, (list, tuple)) and len(row) >= 7:
            parsed.append(
                {
                    "id": row[0],
                    "type": row[1],
                    "title": row[2],
                    "url": row[3],
                    "price_estimate": row[4],
                    "location": row[5],
                    "tags": row[6],
                }
            )
    return parsed


def _row_to_candidate(row: dict[str, Any]) -> CandidateItem | None:
    mapping = {
        "id": row.get("Id") or row.get("id"),
        "type": row.get("Type") or row.get("type"),
        "title": row.get("Title") or row.get("title"),
        "url": row.get("Url") or row.get("url"),
        "price_estimate": row.get("Price") or row.get("price_estimate") or row.get("price"),
        "location": row.get("Loc") or row.get("location"),
        "tags": row.get("Tags") or row.get("tags"),
    }
    if not mapping["id"] or not mapping["title"]:
        return None
    try:
        return CandidateItem(
            id=str(mapping["id"]),
            type=str(mapping["type"] or "event"),  # type: ignore[arg-type]
            title=str(mapping["title"]),
            url=str(mapping["url"] or ""),
            snippet="",
            price_estimate=float(mapping["price_estimate"] or 0),
            location=str(mapping["location"] or ""),
            tags=str(mapping["tags"] or ""),
        )
    except (TypeError, ValueError):
        return None


def _normalize_jarvispy_url(url: str) -> str:
    """JarvisPy API lives on api.prometheux.ai; platform host serves the web UI (HTML)."""
    normalized = url.strip().rstrip("/")
    if "platform.prometheux.ai" in normalized:
        normalized = normalized.replace("platform.prometheux.ai", "api.prometheux.ai")
    return normalized


def _resolve_project_id(px: Any, project_ref: str) -> str:
    """Map PMTX_PROJECT_ID (hash or display name) to a JarvisPy project id."""
    ref = (project_ref or "weekend-planner").strip()
    try:
        projects = px.list_projects(project_scopes=["user"]) or []
    except Exception as exc:
        raise PrometheuxSDKError(f"Could not list Prometheux projects: {exc}") from exc

    if not isinstance(projects, list):
        raise PrometheuxSDKError("Unexpected response listing Prometheux projects.")

    for project in projects:
        if project.get("id") == ref:
            return ref
    for project in projects:
        if project.get("name") == ref:
            return str(project["id"])

    safe_name = re.sub(r"[^a-zA-Z0-9_]+", "_", ref).strip("_") or "weekend_planner"
    try:
        created = px.save_project(project_name=safe_name)
    except Exception as exc:
        raise PrometheuxSDKError(
            f"No Prometheux project matching {ref!r} and could not create one: {exc}"
        ) from exc

    if isinstance(created, str) and created.strip():
        return created.strip()
    raise PrometheuxSDKError(f"Prometheux did not return a project id for {ref!r}.")


def _load_prometheux_sdk() -> Any:
    try:
        import prometheux_chain as px
    except ImportError as exc:
        raise PrometheuxSDKError(
            "prometheux_chain SDK is not installed. "
            "Run: pip install prometheux-chain"
        ) from exc

    token = os.environ.get("PMTX_TOKEN", "").strip()
    if not token:
        raise PrometheuxConfigError(
            "PMTX_TOKEN is not set. Sign up at https://platform.prometheux.ai, "
            "copy your API token, and add PMTX_TOKEN=... to .env.local"
        )

    px.config.set("PMTX_TOKEN", token)
    jarvis_url = os.environ.get("JARVISPY_URL", "").strip()
    if jarvis_url:
        px.config.set("JARVISPY_URL", _normalize_jarvispy_url(jarvis_url))

    return px


T = TypeVar("T")


@dataclass
class _PrometheuxCallBudget:
    """Shared retry/time budget for one Prometheux filter call (save + run)."""

    max_retries: int = MAX_PROMETHEUX_RETRIES
    max_total_seconds: float = MAX_PROMETHEUX_TOTAL_SECONDS
    started_at: float = field(default_factory=time.monotonic)
    retry_count: int = 0

    def elapsed(self) -> float:
        return time.monotonic() - self.started_at

    def remaining(self) -> float:
        return max(0.0, self.max_total_seconds - self.elapsed())

    def can_retry(self) -> bool:
        return self.retry_count < self.max_retries and self.remaining() > 0


def _raise_prometheux_gave_up(
    operation: str,
    budget: _PrometheuxCallBudget,
    last_exc: Exception | None,
) -> None:
    logger.error(
        "Prometheux giving up on %s after %d/%d retries (%.1fs elapsed, limit %.1fs): %s",
        operation,
        budget.retry_count,
        budget.max_retries,
        budget.elapsed(),
        budget.max_total_seconds,
        last_exc,
    )
    retry_after = min(
        60,
        max(5, int(budget.remaining()) if budget.remaining() > 0 else 30),
    )
    raise PrometheuxEngineBusyError(
        f"Prometheux unavailable for {operation} after {budget.retry_count} retries "
        f"within {budget.elapsed():.1f}s (limit {budget.max_total_seconds:.0f}s). "
        "Please wait a few seconds and try again.",
        retry_after_seconds=retry_after,
    ) from last_exc


def _program_hash(program: str) -> str:
    return hashlib.sha256(program.encode()).hexdigest()


def _extract_error_payload(msg: str) -> dict[str, Any] | None:
    """Best-effort JSON parse from HTTP Error / SDK exception text."""
    json_match = re.search(r"\{.*\}", msg, re.DOTALL)
    if not json_match:
        return None
    try:
        payload = json.loads(json_match.group())
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _is_engine_busy_error(exc: Exception) -> bool:
    msg = str(exc)
    if "ENGINE_BUSY" in msg:
        return True
    lower = msg.lower()
    if "409" in msg and (
        "engine is currently busy" in lower
        or "engine busy" in lower
        or '"status":"busy"' in lower
        or "'status': 'busy'" in lower
    ):
        return True
    payload = _extract_error_payload(msg)
    if payload:
        data = payload.get("data")
        if isinstance(data, dict) and data.get("errorCode") == "ENGINE_BUSY":
            return True
        if payload.get("status") == "busy":
            return True
    return False


def _is_concept_overwrite_warning(exc: Exception) -> bool:
    """409 conflict where the API warns that save will overwrite an existing concept."""
    if _is_engine_busy_error(exc):
        return False
    msg = str(exc).lower()
    return "409" in msg and (
        "saving will overwrite" in msg
        or ("already exists" in msg and "overwrite" in msg)
    )


def _is_concept_exists_conflict(exc: Exception) -> bool:
    if _is_engine_busy_error(exc):
        return False
    if _is_concept_overwrite_warning(exc):
        return True
    msg = str(exc).lower()
    return "409" in msg and "already exists" in msg


def _is_concept_not_found_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "concept" in msg and "not found" in msg


def _call_with_budget(
    budget: _PrometheuxCallBudget,
    fn: Callable[[], T],
    *,
    operation: str,
) -> T:
    last_exc: Exception | None = None
    while True:
        if budget.elapsed() >= budget.max_total_seconds:
            _raise_prometheux_gave_up(operation, budget, last_exc)

        try:
            return fn()
        except Exception as exc:
            if not _is_engine_busy_error(exc):
                raise
            last_exc = exc
            if not budget.can_retry():
                _raise_prometheux_gave_up(operation, budget, last_exc)

            delay = min(
                ENGINE_BUSY_BASE_DELAY_S * (2**budget.retry_count),
                ENGINE_BUSY_MAX_DELAY_S,
                budget.remaining(),
            )
            logger.warning(
                "Prometheux ENGINE_BUSY during %s; retry %d/%d in %.1fs (%.1fs elapsed)",
                operation,
                budget.retry_count + 1,
                budget.max_retries,
                delay,
                budget.elapsed(),
            )
            budget.retry_count += 1
            if delay > 0:
                time.sleep(delay)


def _format_sdk_error(exc: Exception) -> str:
    if isinstance(exc, PrometheuxEngineBusyError) or _is_engine_busy_error(exc):
        return (
            "Prometheux inference engine is busy. Requests were retried automatically "
            "with exponential backoff, but the engine did not become available. "
            "Wait a few seconds and try again."
        )
    msg = str(exc).lower()
    if any(token in msg for token in ("401", "403", "unauthorized", "invalid token", "authentication")):
        return (
            "Prometheux authentication failed. Verify PMTX_TOKEN at "
            "https://platform.prometheux.ai and ensure it is set in .env.local. "
            f"Error: {exc}"
        )
    if "no_active_compute" in msg or "no active compute" in msg:
        return (
            "Prometheux compute is not running. Start compute on the Prometheux platform, "
            "then retry. "
            f"Error: {exc}"
        )
    return (
        "Prometheux SDK failed. Verify PMTX_TOKEN at https://platform.prometheux.ai, "
        "set JARVISPY_URL=https://api.prometheux.ai/jarvispy/{org}/{username}, "
        "start compute on the Prometheux platform if you see NO_ACTIVE_COMPUTE, "
        "and set PMTX_PROJECT_ID to your project name or id (default weekend-planner). "
        f"Error: {exc}"
    )


def _extract_conflicting_concept_name(exc: Exception) -> str | None:
    match = re.search(r"concept named ['\"]([^'\"]+)['\"]", str(exc), re.IGNORECASE)
    return match.group(1) if match else None


def _run_concept_name_from_save(response: Any) -> str:
    if isinstance(response, dict):
        for key in ("id", "concept_name", "predicate_name"):
            value = response.get(key)
            if value:
                return str(value)
    return OUTPUT_PREDICATE


def _overwrite_existing_names(exc: Exception) -> list[str]:
    """Names to pass as existing_name when Prometheux asks to confirm overwrite."""
    names: list[str] = []
    parsed = _extract_conflicting_concept_name(exc)
    if parsed:
        names.append(parsed)
    for candidate in (OUTPUT_PREDICATE, CONCEPT_NAME):
        if candidate not in names:
            names.append(candidate)
    return names


def _handle_save_conflict(
    px: Any,
    budget: _PrometheuxCallBudget,
    kwargs: dict[str, Any],
    exc: Exception,
) -> str:
    """On 409: confirm overwrite once with existing_name, else skip save and run only."""
    existing_name = _overwrite_existing_names(exc)[0]
    logger.info(
        "Prometheux 409 conflict (%s); confirming overwrite with existing_name=%s",
        exc,
        existing_name,
    )
    try:
        result = _call_with_budget(
            budget,
            lambda: px.save_concept(**kwargs, existing_name=existing_name),
            operation="save_concept(overwrite)",
        )
        run_name = _run_concept_name_from_save(result)
        logger.info(
            "Prometheux save confirmed (existing_name=%s, run_as=%s)",
            existing_name,
            run_name,
        )
        return run_name
    except Exception as retry_exc:
        if not (
            _is_concept_overwrite_warning(retry_exc)
            or _is_concept_exists_conflict(retry_exc)
        ):
            raise retry_exc from exc
        logger.warning(
            "Prometheux save still conflicting after existing_name=%s (%s); "
            "skipping save and proceeding to run_concept as %s",
            existing_name,
            retry_exc,
            existing_name,
        )
        return existing_name


def _save_concept(
    px: Any,
    project_id: str,
    program: str,
    budget: _PrometheuxCallBudget,
    *,
    force: bool = False,
) -> str:
    """Save the Vadalog program and return the SDK concept name for run_concept."""
    global _saved_program_hash, _saved_run_concept_name

    prog_hash = _program_hash(program)
    if not force and _saved_program_hash is not None and _saved_program_hash == prog_hash:
        run_name = _saved_run_concept_name or OUTPUT_PREDICATE
        logger.info(
            "Prometheux: skipping save_concept (program unchanged, hash=%s, run_as=%s)",
            prog_hash[:12],
            run_name,
        )
        return run_name

    kwargs = {
        "project_id": project_id,
        "definition": program,
        "concept_name": CONCEPT_NAME,
        "output_predicate": OUTPUT_PREDICATE,
    }
    saved = False

    def do_save() -> str:
        nonlocal saved
        try:
            result = px.save_concept(**kwargs)
            saved = True
            return _run_concept_name_from_save(result)
        except Exception as exc:
            if _is_engine_busy_error(exc):
                raise
            if _is_concept_overwrite_warning(exc) or _is_concept_exists_conflict(exc):
                saved = True
                return _handle_save_conflict(px, budget, kwargs, exc)
            raise

    run_name = _call_with_budget(budget, do_save, operation="save_concept")
    if saved:
        _saved_program_hash = prog_hash
        _saved_run_concept_name = run_name
    return run_name


def _run_concept_with_budget(
    px: Any,
    project_id: str,
    concept_name: str,
    budget: _PrometheuxCallBudget,
) -> Any:
    return _call_with_budget(
        budget,
        lambda: px.run_concept(project_id=project_id, concept_name=concept_name),
        operation=f"run_concept({concept_name})",
    )


@contextmanager
def _prometheux_job_slot() -> Generator[None, None, None]:
    """Serialize Prometheux SDK work globally with a minimum gap between jobs."""
    global _last_prometheux_job_end
    with _prometheux_lock:
        now = time.monotonic()
        if _last_prometheux_job_end > 0:
            gap = MIN_GAP_BETWEEN_JOBS_S - (now - _last_prometheux_job_end)
            if gap > 0:
                logger.info("Prometheux queue: waiting %.1fs before next job", gap)
                time.sleep(gap)
        try:
            yield
        finally:
            _last_prometheux_job_end = time.monotonic()


def _filter_with_sdk(program: str) -> list[CandidateItem]:
    px = _load_prometheux_sdk()
    project_ref = os.environ.get("PMTX_PROJECT_ID", "weekend-planner").strip() or "weekend-planner"
    project_id = _resolve_project_id(px, project_ref)
    budget = _PrometheuxCallBudget()

    logger.info(
        "Prometheux SDK: save_concept + run_concept concept=%s project=%s (ref=%s) "
        "(max %d retries, %.0fs total)",
        CONCEPT_NAME,
        project_id,
        project_ref,
        budget.max_retries,
        budget.max_total_seconds,
    )

    with _prometheux_job_slot():
        try:
            run_concept_name = _save_concept(px, project_id, program, budget)

            try:
                result = _run_concept_with_budget(
                    px, project_id, run_concept_name, budget
                )
            except Exception as run_exc:
                if not _is_concept_not_found_error(run_exc):
                    raise
                if not budget.can_retry():
                    logger.error(
                        "Prometheux concept %r not found and retry budget exhausted "
                        "(%d/%d retries, %.1fs elapsed); giving up",
                        run_concept_name,
                        budget.retry_count,
                        budget.max_retries,
                        budget.elapsed(),
                    )
                    raise PrometheuxSDKError(
                        f"Prometheux concept {run_concept_name!r} not found and retries exhausted."
                    ) from run_exc

                fallback_name = (
                    OUTPUT_PREDICATE
                    if run_concept_name != OUTPUT_PREDICATE
                    else CONCEPT_NAME
                )
                budget.retry_count += 1
                if fallback_name != run_concept_name:
                    logger.warning(
                        "Prometheux concept %r not found; retrying run_concept as %r",
                        run_concept_name,
                        fallback_name,
                    )
                    try:
                        result = _run_concept_with_budget(
                            px, project_id, fallback_name, budget
                        )
                        global _saved_run_concept_name
                        _saved_run_concept_name = fallback_name
                    except Exception as fallback_exc:
                        if not _is_concept_not_found_error(fallback_exc):
                            raise
                        run_exc = fallback_exc
                    else:
                        run_exc = None

                if run_exc is not None:
                    if not budget.can_retry():
                        logger.error(
                            "Prometheux concept not found after fallback; "
                            "retry budget exhausted; giving up"
                        )
                        raise PrometheuxSDKError(
                            f"Prometheux concept not found after retries: {run_exc}"
                        ) from run_exc
                    logger.warning(
                        "Prometheux concept %r not found in project %s; "
                        "forcing one save_concept and retrying run",
                        run_concept_name,
                        project_id,
                    )
                    global _saved_program_hash
                    _saved_program_hash = None
                    _saved_run_concept_name = None
                    budget.retry_count += 1
                    run_concept_name = _save_concept(
                        px, project_id, program, budget, force=True
                    )
                    result = _run_concept_with_budget(
                        px, project_id, run_concept_name, budget
                    )
        except PrometheuxEngineBusyError:
            raise
        except Exception as exc:
            raise PrometheuxSDKError(_format_sdk_error(exc)) from exc

    rows = _parse_matches_rows(result)
    logger.info("Prometheux SDK returned %d matching rows (deterministic Vadalog)", len(rows))
    return [item for row in rows if (item := _row_to_candidate(row)) is not None]


def filter_candidates(
    candidates: list[CandidateItem],
    context: UserConstraintContext | PlanRequest,
) -> FilterResult:
    if isinstance(context, PlanRequest):
        context = context_from_plan(context)

    candidates_in = len(candidates)
    if not candidates:
        return FilterResult(
            candidates=[],
            candidates_in=0,
            candidates_out=0,
            filter_method="sdk",
        )

    source_by_id = {item.id: item for item in candidates}
    program = build_vadalog_program(candidates, context)
    logger.debug("Vadalog program:\n%s", program)

    filtered = _filter_with_sdk(program)
    passed_rules_by_id: dict[str, list[str]] = {}
    enriched: list[CandidateItem] = []

    for item in filtered:
        source = source_by_id.get(item.id)
        if source:
            merged = source.model_copy(
                update={
                    "title": item.title or source.title,
                    "url": item.url or source.url,
                    "price_estimate": item.price_estimate,
                    "location": item.location or source.location,
                    "tags": item.tags or source.tags,
                }
            )
        else:
            merged = item
        rules = compute_passed_rules(merged, context)
        passed_rules_by_id[merged.id] = rules
        enriched.append(merged)

    return FilterResult(
        candidates=enriched,
        candidates_in=candidates_in,
        candidates_out=len(enriched),
        filter_method="sdk",
        passed_rules_by_id=passed_rules_by_id,
    )
