from __future__ import annotations

from pathlib import Path

from models import CandidateItem, FilterStats, ItineraryItem

REPO_ROOT = Path(__file__).resolve().parent.parent
CITED_MD_PATH = REPO_ROOT / "cited.md"


def _escape_md_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def _passed_rules_label(item: CandidateItem) -> str:
    parts = ["budget", "location"]
    tags_blob = f"{item.tags} {item.title} {item.snippet}".lower()
    if any(token in tags_blob for token in ("vegan", "vegetarian", "gluten", "halal", "kosher")):
        parts.append("diet")
    if any(token in tags_blob for token in ("outdoor", "music", "museum", "kid", "hike", "art")):
        parts.append("activity")
    if "wheelchair" in tags_blob or "accessible" in tags_blob:
        parts.append("accessibility")
    return ", ".join(parts)


def write_cited_md(
    itinerary: list[ItineraryItem],
    verified: list[CandidateItem],
    filter_stats: FilterStats,
) -> Path:
    lines: list[str] = [
        "# Sidequest — Cited Itinerary",
        "",
        "## Prometheux filter (Vadalog)",
        "",
        f"- **Method:** `{filter_stats.filter_method}` (deterministic — not LLM)",
        f"- **Concept:** `{filter_stats.concept_name}`",
        f"- **Candidates in:** {filter_stats.candidates_in}",
        f"- **Candidates out:** {filter_stats.candidates_out}",
        "",
        "Only rows below passed Vadalog rules (budget, location, diet, activity, accessibility). "
        "Gemini formatted the itinerary from this verified set only.",
        "",
        "## Verified candidates",
        "",
        "| ID | Type | Venue | Price | Location | Tags | Passed rules |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]

    for item in verified:
        lines.append(
            "| "
            + " | ".join(
                [
                    _escape_md_cell(item.id),
                    _escape_md_cell(item.type),
                    _escape_md_cell(item.title),
                    f"${item.price_estimate:.0f}",
                    _escape_md_cell(item.location),
                    _escape_md_cell(item.tags),
                    _escape_md_cell(_passed_rules_label(item)),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Itinerary",
            "",
            "| Time | Activity | Venue | Cost | Diet/Access | Source URL |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )

    for item in itinerary:
        citation = f"[{item.source_index}]"
        lines.append(
            "| "
            + " | ".join(
                [
                    _escape_md_cell(item.time),
                    _escape_md_cell(item.activity),
                    _escape_md_cell(item.venue),
                    _escape_md_cell(item.cost),
                    _escape_md_cell(item.diet_access),
                    f"{citation} {_escape_md_cell(item.source_url)}",
                ]
            )
            + " |"
        )

    lines.extend(["", "## Sources", ""])
    for idx, source in enumerate(verified, start=1):
        lines.append(f"{idx}. [{source.title}]({source.url})")

    content = "\n".join(lines) + "\n"
    CITED_MD_PATH.write_text(content, encoding="utf-8")
    return CITED_MD_PATH.resolve()
