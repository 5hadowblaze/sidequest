from __future__ import annotations

from pathlib import Path

import pytest

import format_output
from format_output import write_cited_md


def test_write_cited_md_output_shape(
    tmp_path: Path,
    sample_itinerary,
    sample_candidates,
    sample_filter_stats,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cited_path = tmp_path / "cited.md"
    monkeypatch.setattr(format_output, "CITED_MD_PATH", cited_path)

    result_path = write_cited_md(
        sample_itinerary,
        sample_candidates[:2],
        sample_filter_stats,
    )

    assert result_path == cited_path.resolve()
    content = cited_path.read_text(encoding="utf-8")

    assert "# Sidequest — Cited Itinerary" in content
    assert "## Prometheux filter (Vadalog)" in content
    assert "**Method:** `sdk`" in content
    assert "**Concept:** `weekend_planner_matches`" in content
    assert "**Candidates in:** 3" in content
    assert "**Candidates out:** 2" in content
    assert "## Verified candidates" in content
    assert "| ID | Type | Venue | Price | Location | Tags | Passed rules |" in content
    assert "evt_1" in content
    assert "rst_1" in content
    assert "## Itinerary" in content
    assert "| Time | Activity | Venue | Cost | Diet/Access | Source URL |" in content
    assert "Saturday 14:00" in content
    assert "Vegan Garden Austin" in content
    assert "## Sources" in content
    assert "[Saturday Jazz in Austin](https://example.com/jazz)" in content


def test_write_cited_md_escapes_pipe_characters(
    tmp_path: Path,
    sample_filter_stats,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from models import CandidateItem, ItineraryItem

    cited_path = tmp_path / "cited.md"
    monkeypatch.setattr(format_output, "CITED_MD_PATH", cited_path)

    verified = [
        CandidateItem(
            id="e1",
            type="event",
            title="A | B Venue",
            url="https://example.com",
            snippet="s",
            price_estimate=10,
            location="City",
            tags="tag|ged",
        )
    ]
    itinerary = [
        ItineraryItem(
            time="Sat | Sun",
            activity="Fun",
            venue="A | B",
            cost="$10",
            diet_access="—",
            source_url="https://example.com",
            source_index=1,
        )
    ]

    write_cited_md(itinerary, verified, sample_filter_stats)
    content = cited_path.read_text(encoding="utf-8")
    assert "A \\| B" in content
    assert "tag\\|ged" in content
