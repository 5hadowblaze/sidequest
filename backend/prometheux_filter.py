from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from models import (
    CalendarSlot,
    CandidateItem,
    PlanRequest,
    UserConstraintContext,
)

logger = logging.getLogger(__name__)

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


def _save_concept(px: Any, project_id: str, program: str) -> str:
    """Save the Vadalog program and return the concept name for run_concept."""
    kwargs = {
        "project_id": project_id,
        "definition": program,
        "concept_name": CONCEPT_NAME,
        "output_predicate": OUTPUT_PREDICATE,
    }
    try:
        px.save_concept(**kwargs)
        return CONCEPT_NAME
    except Exception as exc:
        msg = str(exc).lower()
        if "409" not in msg and "already exists" not in msg:
            raise
        logger.info(
            "Prometheux concept conflict; overwriting existing_name=%s",
            OUTPUT_PREDICATE,
        )
        px.save_concept(**kwargs, existing_name=OUTPUT_PREDICATE)
        return OUTPUT_PREDICATE


def _filter_with_sdk(program: str) -> list[CandidateItem]:
    px = _load_prometheux_sdk()
    project_ref = os.environ.get("PMTX_PROJECT_ID", "weekend-planner").strip() or "weekend-planner"
    project_id = _resolve_project_id(px, project_ref)

    logger.info(
        "Prometheux SDK: save_concept + run_concept concept=%s project=%s (ref=%s)",
        CONCEPT_NAME,
        project_id,
        project_ref,
    )

    try:
        concept_name = _save_concept(px, project_id, program)
        result = px.run_concept(project_id=project_id, concept_name=concept_name)
    except Exception as exc:
        raise PrometheuxSDKError(
            "Prometheux SDK failed. Verify PMTX_TOKEN at https://platform.prometheux.ai, "
            "set JARVISPY_URL=https://api.prometheux.ai/jarvispy/{org}/{username}, "
            "start compute on the Prometheux platform if you see NO_ACTIVE_COMPUTE, "
            "and set PMTX_PROJECT_ID to your project name or id (default weekend-planner). "
            f"Error: {exc}"
        ) from exc

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
