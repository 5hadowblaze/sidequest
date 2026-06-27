from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from models import CandidateItem, UserConstraintContext
from prometheux_filter import (
    CONCEPT_NAME,
    FilterResult,
    PrometheuxConfigError,
    PrometheuxEngineBusyError,
    PrometheuxSDKError,
    _format_sdk_error,
    _is_concept_exists_conflict,
    _is_concept_not_found_error,
    _is_concept_overwrite_warning,
    _is_engine_busy_error,
    _parse_matches_rows,
    _program_hash,
    build_vadalog_program,
    compute_passed_rules,
    context_from_plan,
    filter_candidates,
    sanitize_vadalog_string,
)
import prometheux_filter as pf


def test_sanitize_vadalog_string_strips_quotes_and_backslashes() -> None:
    assert sanitize_vadalog_string('Dancing with the "Stars"') == (
        "Dancing with the 'Stars'"
    )
    assert sanitize_vadalog_string("path\\to\\show") == "path to show"


def test_sanitize_vadalog_string_normalizes_whitespace_and_truncates() -> None:
    assert sanitize_vadalog_string("line1\nline2\r\nline3") == "line1 line2 line3"
    long_text = "a" * 500
    assert len(sanitize_vadalog_string(long_text, max_len=100)) == 100


def test_build_vadalog_program_sanitizes_problematic_candidate_text() -> None:
    ctx = UserConstraintContext(budget=150, home_location="Austin", diet="vegan", activities="music")
    candidates = [
        CandidateItem(
            id="evt_quote",
            type="event",
            title='Watch "Dancing with the Stars" Live',
            url="https://example.com/event?id=1&name=foo",
            snippet='Austin show\nwith "quotes" and\\backslashes',
            price_estimate=25,
            location="Austin, TX",
            tags="music, live",
            date_hint="Saturday evening",
        )
    ]
    program = build_vadalog_program(candidates, ctx)
    assert 'candidate("evt_quote"' in program
    assert "'Dancing with the Stars'" in program
    assert "\n" not in program.split("candidate(")[1].split(").")[0]
    assert "backslashes" in program
    assert "\\" not in program.split("candidate(")[1].split(").")[0]


def test_context_from_plan(sample_plan_request) -> None:
    ctx = context_from_plan(sample_plan_request)
    assert ctx.budget == sample_plan_request.budget
    assert ctx.home_location == sample_plan_request.location
    assert len(ctx.calendar_slots) == len(sample_plan_request.calendar_slots)


def test_build_vadalog_program_includes_candidate_facts(
    sample_candidates, sample_context
) -> None:
    program = build_vadalog_program(sample_candidates, sample_context)
    assert 'candidate("evt_1"' in program
    assert "max_budget(80)." in program
    assert 'target_location("austin").' in program
    assert "has_diet_constraints." in program
    assert "has_activity_constraints." in program
    assert "has_access_constraints." in program
    assert "has_calendar_constraints." in program
    assert 'required_diet_token("vegan").' in program
    assert 'free_slot("saturday", "afternoon").' in program
    assert '@output("matches").' in program


def test_build_vadalog_program_without_optional_constraints() -> None:
    ctx = UserConstraintContext(budget=50, home_location="Austin")
    candidates = [
        CandidateItem(
            id="e1",
            type="event",
            title="Show",
            url="u",
            snippet="s",
            price_estimate=10,
            location="Austin",
            tags="music",
        )
    ]
    program = build_vadalog_program(candidates, ctx)
    assert 'required_diet_token("' not in program
    assert 'required_activity_token("' not in program
    assert 'free_slot("' not in program


def test_compute_passed_rules_budget_and_location(
    sample_candidates, sample_context
) -> None:
    item = sample_candidates[0]
    rules = compute_passed_rules(item, sample_context)
    assert "budget_ok" in rules
    assert "loc_ok" in rules
    assert "diet_match" in rules


def test_compute_passed_rules_rejects_over_budget() -> None:
    ctx = UserConstraintContext(budget=10, home_location="Austin")
    item = CandidateItem(
        id="x",
        type="event",
        title="Gala",
        url="u",
        snippet="s",
        price_estimate=500,
        location="Austin",
        tags="gala",
    )
    rules = compute_passed_rules(item, ctx)
    assert "budget_ok" not in rules


def test_compute_passed_rules_calendar_slot(
    sample_candidates, sample_context
) -> None:
    item = sample_candidates[0]
    rules = compute_passed_rules(item, sample_context)
    assert any(rule.startswith("free_slot_") for rule in rules)


def test_parse_matches_rows_dict_with_matches_key() -> None:
    rows = _parse_matches_rows(
        {"matches": [{"id": "e1", "title": "Show", "type": "event", "url": "u", "price_estimate": 5, "location": "A", "tags": "t"}]}
    )
    assert len(rows) == 1
    assert rows[0]["id"] == "e1"


def test_parse_matches_rows_tuple_format() -> None:
    rows = _parse_matches_rows([("e1", "event", "Show", "u", 5, "A", "tags")])
    assert rows[0]["title"] == "Show"


def test_parse_matches_rows_none_returns_empty() -> None:
    assert _parse_matches_rows(None) == []


@patch("prometheux_filter._filter_with_sdk")
def test_filter_candidates_with_mock_sdk(
    mock_sdk: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    mock_sdk.return_value = sample_candidates[:2]
    result = filter_candidates(sample_candidates, sample_context)
    assert isinstance(result, FilterResult)
    assert result.candidates_in == 3
    assert result.candidates_out == 2
    assert result.filter_method == "sdk"
    assert result.concept_name == CONCEPT_NAME
    assert "evt_1" in result.passed_rules_by_id
    mock_sdk.assert_called_once()
    program_arg = mock_sdk.call_args[0][0]
    assert "candidate(" in program_arg


def test_filter_candidates_empty_list(sample_context) -> None:
    result = filter_candidates([], sample_context)
    assert result.candidates == []
    assert result.candidates_in == 0
    assert result.candidates_out == 0


@patch("prometheux_filter.px", create=True)
def test_filter_with_sdk_calls_run_concept(
    mock_px_module: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._saved_run_concept_name = None
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    mock_px.save_concept.return_value = {"id": "matches"}
    mock_px.run_concept.return_value = {
        "matches": [
            {
                "id": "evt_1",
                "type": "event",
                "title": "Saturday Jazz in Austin",
                "url": "https://example.com/jazz",
                "price_estimate": 25.0,
                "location": "Austin, TX",
                "tags": "music",
            }
        ]
    }

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        program = build_vadalog_program(sample_candidates, sample_context)
        filtered = _filter_with_sdk(program)

    assert len(filtered) == 1
    assert filtered[0].id == "evt_1"
    mock_px.save_concept.assert_called_once()
    mock_px.run_concept.assert_called_once()


def test_load_prometheux_sdk_missing_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PMTX_TOKEN", raising=False)
    from prometheux_filter import _load_prometheux_sdk

    with pytest.raises(PrometheuxConfigError, match="PMTX_TOKEN"):
        _load_prometheux_sdk()


def test_is_engine_busy_error_parses_http_409_payload() -> None:
    exc = Exception(
        'HTTP Error 409: {"status":"busy","message":"The engine is currently busy.",'
        '"data":{"errorCode":"ENGINE_BUSY"}}'
    )
    assert _is_engine_busy_error(exc) is True
    assert _is_concept_exists_conflict(exc) is False


def test_is_concept_exists_conflict_detects_already_exists() -> None:
    exc = Exception("HTTP Error 409: concept already exists")
    assert _is_engine_busy_error(exc) is False
    assert _is_concept_exists_conflict(exc) is True


def test_is_concept_overwrite_warning_detects_matches_conflict() -> None:
    exc = Exception(
        'HTTP Error 409: {"status":"conflict","message":"A concept named '
        "'matches' already exists. Saving will overwrite it.\",\"data\":null}"
    )
    assert _is_engine_busy_error(exc) is False
    assert _is_concept_overwrite_warning(exc) is True
    assert _is_concept_exists_conflict(exc) is True


@patch("prometheux_filter.time.sleep")
def test_filter_with_sdk_handles_overwrite_warning_409(
    mock_sleep: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._last_prometheux_job_end = 0.0
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    overwrite_error = Exception(
        'HTTP Error 409: {"status":"conflict","message":"A concept named '
        "'matches' already exists. Saving will overwrite it.\",\"data\":null}"
    )
    mock_px.save_concept.side_effect = [overwrite_error, {"id": "matches"}]
    mock_px.run_concept.return_value = {
        "matches": [
            {
                "id": "evt_1",
                "type": "event",
                "title": "Saturday Jazz in Austin",
                "url": "https://example.com/jazz",
                "price_estimate": 25.0,
                "location": "Austin, TX",
                "tags": "music",
            }
        ]
    }

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        program = build_vadalog_program(sample_candidates, sample_context)
        filtered = _filter_with_sdk(program)

    assert len(filtered) == 1
    assert filtered[0].id == "evt_1"
    assert mock_px.save_concept.call_count == 2
    assert mock_px.save_concept.call_args_list[1].kwargs["existing_name"] == "matches"
    mock_px.run_concept.assert_called_once_with(
        project_id="proj-1", concept_name="matches"
    )


@patch("prometheux_filter.time.sleep")
def test_filter_with_sdk_confirms_overwrite_with_concept_name(
    mock_sleep: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._last_prometheux_job_end = 0.0
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    overwrite_error = Exception(
        'HTTP Error 409: {"status":"conflict","message":"A concept named '
        "'matches' already exists. Saving will overwrite it.\",\"data\":null}"
    )
    mock_px.save_concept.side_effect = [overwrite_error, {"id": "matches"}]
    mock_px.run_concept.return_value = {"matches": []}

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        program = build_vadalog_program(sample_candidates, sample_context)
        _filter_with_sdk(program)

    assert mock_px.save_concept.call_count == 2
    assert mock_px.save_concept.call_args_list[0].kwargs["concept_name"] == CONCEPT_NAME
    assert mock_px.save_concept.call_args_list[0].kwargs["output_predicate"] == "matches"
    assert mock_px.save_concept.call_args_list[1].kwargs["existing_name"] == "matches"


def test_format_sdk_error_distinguishes_engine_busy() -> None:
    busy = PrometheuxEngineBusyError("engine busy after retries")
    assert "engine is busy" in _format_sdk_error(busy).lower()
    assert "PMTX_TOKEN" not in _format_sdk_error(busy)


def test_format_sdk_error_distinguishes_auth_failure() -> None:
    exc = Exception("HTTP Error 401: unauthorized")
    assert "authentication failed" in _format_sdk_error(exc).lower()
    assert "PMTX_TOKEN" in _format_sdk_error(exc)


@patch("prometheux_filter.time.sleep")
def test_filter_with_sdk_retries_on_engine_busy(
    mock_sleep: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._last_prometheux_job_end = 0.0
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    busy_error = Exception(
        'HTTP Error 409: {"status":"busy","data":{"errorCode":"ENGINE_BUSY"}}'
    )
    mock_px.save_concept.side_effect = [busy_error, {"id": "matches"}]
    mock_px.run_concept.return_value = {
        "matches": [
            {
                "id": "evt_1",
                "type": "event",
                "title": "Saturday Jazz in Austin",
                "url": "https://example.com/jazz",
                "price_estimate": 25.0,
                "location": "Austin, TX",
                "tags": "music",
            }
        ]
    }

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        program = build_vadalog_program(sample_candidates, sample_context)
        filtered = _filter_with_sdk(program)

    assert len(filtered) == 1
    assert mock_px.save_concept.call_count == 2
    mock_sleep.assert_called_once_with(2.0)


@patch("prometheux_filter.time.sleep")
def test_filter_with_sdk_skips_save_when_program_unchanged(
    mock_sleep: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._last_prometheux_job_end = 0.0
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    mock_px.run_concept.return_value = {"matches": []}

    program = build_vadalog_program(sample_candidates, sample_context)
    pf._saved_program_hash = _program_hash(program)

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        _filter_with_sdk(program)

    mock_px.save_concept.assert_not_called()
    mock_px.run_concept.assert_called_once()


def test_is_concept_not_found_error_detects_500() -> None:
    exc = Exception(
        "HTTP Error 500: Concept 'weekend_planner_matches' not found in project 275037ac3d9"
    )
    assert _is_concept_not_found_error(exc) is True


@patch("prometheux_filter.time.sleep")
def test_filter_with_sdk_retries_on_concept_not_found(
    mock_sleep: MagicMock,
    sample_candidates,
    sample_context,
) -> None:
    pf._saved_program_hash = None
    pf._last_prometheux_job_end = 0.0
    mock_px = MagicMock()
    mock_px.list_projects.return_value = [{"id": "proj-1", "name": "weekend-planner"}]
    not_found_error = Exception(
        "HTTP Error 500: Concept 'weekend_planner_matches' not found in project proj-1"
    )
    match_row = {
        "id": "evt_1",
        "type": "event",
        "title": "Saturday Jazz in Austin",
        "url": "https://example.com/jazz",
        "price_estimate": 25.0,
        "location": "Austin, TX",
        "tags": "music",
    }
    mock_px.run_concept.side_effect = [not_found_error, {"matches": [match_row]}]

    program = build_vadalog_program(sample_candidates, sample_context)
    pf._saved_program_hash = _program_hash(program)
    pf._saved_run_concept_name = CONCEPT_NAME

    with patch("prometheux_filter._load_prometheux_sdk", return_value=mock_px):
        from prometheux_filter import _filter_with_sdk

        filtered = _filter_with_sdk(program)

    assert len(filtered) == 1
    assert filtered[0].id == "evt_1"
    assert mock_px.save_concept.call_count == 0
    assert mock_px.run_concept.call_count == 2
    assert mock_px.run_concept.call_args_list[0].kwargs["concept_name"] == CONCEPT_NAME
    assert mock_px.run_concept.call_args_list[1].kwargs["concept_name"] == "matches"
    assert pf._saved_run_concept_name == "matches"
