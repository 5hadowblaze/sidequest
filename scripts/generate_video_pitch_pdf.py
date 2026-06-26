#!/usr/bin/env python3
"""Generate VIDEO_PITCH.pdf from structured pitch script content."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(__file__).resolve().parent.parent / "VIDEO_PITCH.pdf"

# Brand-ish palette
ACCENT = colors.HexColor("#2563EB")
MUTED = colors.HexColor("#64748B")
DARK = colors.HexColor("#0F172A")
RULE_BG = colors.HexColor("#F1F5F9")


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "SidequestTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=36,
            leading=42,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "tagline": ParagraphStyle(
            "Tagline",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=16,
            leading=22,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceAfter=24,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "act_heading": ParagraphStyle(
            "ActHeading",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=ACCENT,
            spaceBefore=18,
            spaceAfter=6,
        ),
        "stage": ParagraphStyle(
            "Stage",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            spaceAfter=8,
        ),
        "direction": ParagraphStyle(
            "Direction",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "dialogue": ParagraphStyle(
            "Dialogue",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=DARK,
            leftIndent=12,
            spaceAfter=10,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=DARK,
            spaceBefore=20,
            spaceAfter=10,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=DARK,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=DARK,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=4,
        ),
    }


def act_block(story, styles, heading, stage, directions, dialogue_paragraphs):
    story.append(Paragraph(esc(heading), styles["act_heading"]))
    if stage:
        story.append(Paragraph(f"<i>{esc(stage)}</i>", styles["stage"]))
    for d in directions:
        story.append(Paragraph(esc(d), styles["direction"]))
    for para in dialogue_paragraphs:
        story.append(Paragraph(f'"{esc(para)}"', styles["dialogue"]))


def main():
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="Sidequest — Hackathon Video Pitch Script",
        author="Sidequest",
    )

    story = []

    # Title page
    story.append(Spacer(1, 1.6 * inch))
    story.append(Paragraph("Sidequest", styles["title"]))
    story.append(Paragraph("your weekend, verified", styles["tagline"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="60%", thickness=1, color=ACCENT, spaceAfter=20))
    story.append(
        Paragraph("Hackathon Video Pitch Script (v1)", styles["meta"])
    )
    story.append(
        Paragraph(
            "Format: Optional 10 sec on camera → screen recording with voiceover. No slides.",
            styles["meta"],
        )
    )
    story.append(Paragraph("Target length: ~2:50–3:00", styles["meta"]))
    story.append(PageBreak())

    # ACT 1
    act_block(
        story,
        styles,
        "ACT 1 — The problem (0:00 – 0:40)",
        "You, casual — walking in London or at your laptop",
        [],
        [
            "I'm in London right now. I go to hackathons all the time — I sign up on Luma, "
            "I commit to the build, I'm in the zone Saturday… and then there's the rest of the weekend.",
            "The problem isn't that there's nothing to do. There's too much. Hackathons, meetups, "
            "pop-ups, dinner with friends, a swim at Hampstead Heath if the weather's right — but I don't "
            "have the time to scroll through a hundred listings and figure out: Can I actually make this? "
            "Can I afford it? Do I even want it? And if a mate's free — does anything work for both of us?",
            "I kept closing tabs and still not knowing what my weekend was. That's the thing I wanted to fix.",
        ],
    )

    # ACT 2
    act_block(
        story,
        styles,
        "ACT 2 — What I built (0:40 – 1:00)",
        "Cut to Sidequest",
        [],
        [
            "So I built Sidequest — your weekend, verified.",
            "You set your constraints — budget, diet, what you're in the mood for. It reads your calendar "
            "so it knows when you're free. It searches the live web for real events, runs them through a "
            "deterministic filter so junk never reaches the AI, and gives you a plan with citations — not vibes.",
        ],
    )

    # ACT 3
    act_block(
        story,
        styles,
        "ACT 3 — Demo: Discover (1:00 – 1:55)",
        None,
        [
            "[Sign in → profile: London, budget, preferences]",
            "[Map loads — events pin across the city]",
            "[Tap a card — badges: Budget, Diet, free Saturday afternoon]",
        ],
        [
            "I'm in London. Say I want something under fifty quid, I'm vegan, and I'm into live music and getting outside.",
            "Sidequest hits the open web with Tavily — actual listings, this week. Then Prometheux applies Vadalog rules: "
            "budget, location, diet, my free slots from Google Calendar. Twelve in, four out — only what passed shows up here.",
            "Every badge is a rule that passed. I'm not trusting an LLM to guess whether Hampstead Heath or a rooftop gig "
            "fits my life — the logic already decided.",
        ],
    )

    # ACT 4
    act_block(
        story,
        styles,
        "ACT 4 — Demo: Plan (1:55 – 2:40)",
        None,
        [
            "[Select event → Plan this weekend]",
            "[Results panel — itinerary + filter stats]",
            "[Open cited.md]",
        ],
        [
            "This one's interesting. I plan the full weekend around it — events, food, the lot. Same pipeline: search, "
            "verify, then Gemini formats an itinerary from verified rows only. No invented restaurants.",
            "Saturday afternoon, Sunday morning — real venues, real links, real prices.",
            "And the agent publishes to cited.md — filter stats, every verified candidate, the full itinerary, sources. "
            "If a judge — or future me — asks 'why this plan?', the answer is in the file.",
        ],
    )

    # ACT 5
    act_block(
        story,
        styles,
        "ACT 5 — Close (2:40 – 3:00)",
        None,
        ["[End card: Sidequest logo + GitHub + 'your weekend, verified']"],
        [
            "Sometimes I want a hackathon. Sometimes drinks with friends. Sometimes a swim. Sidequest doesn't pick for me — "
            "it cuts the scroll, applies my constraints, and only shows what's real.",
            "Your main quest might be the build. Sidequest is everything else — verified.",
            "GitHub in the description. Go plan your weekend.",
        ],
    )

    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MUTED, spaceAfter=12))

    # Shot list
    story.append(Paragraph("Shot list", styles["section"]))
    shot_data = [
        ["Time", "Visual"],
        ["0:00", "You talking OR phone scrolling aimlessly (B-roll)"],
        ["0:40", "Sidequest sign-in screen"],
        ["1:00", "Onboarding form fill"],
        ["1:10", "Map + event cards + filter stats"],
        ["1:30", "Event card badges close-up"],
        ["1:55", "Plan button → loading → results panel"],
        ["2:15", "cited.md scroll"],
        ["2:35", "Langfuse trace (optional, 3 sec)"],
        ["2:50", "End card"],
    ]
    table = Table(shot_data, colWidths=[0.75 * inch, 5.5 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, RULE_BG]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ]
        )
    )
    story.append(table)

    # One-liner
    story.append(Paragraph("One-liner", styles["section"]))
    story.append(
        Paragraph(
            '"I built Sidequest because London weekends are full of options — and I was spending '
            'more time scrolling than actually living them."',
            styles["dialogue"],
        )
    )

    # Checklist
    story.append(Paragraph("Hackathon checklist", styles["section"]))
    checklist = [
        "Autonomous agent on open web (Tavily)",
        "Prometheux deterministic filter",
        "cited.md mandatory output",
        "Live functional demo",
        "Sponsor tools: Tavily, Prometheux, Gemini, Langfuse, Firebase",
    ]
    for item in checklist:
        story.append(Paragraph(f"• {esc(item)}", styles["bullet"]))

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
