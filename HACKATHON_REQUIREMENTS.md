# Hackathon Requirements

Official requirements to qualify for prizes and stay aligned with judging criteria.

**Sidequest** earned **2nd place** at Multiagents Hackathon (June 2026).

## Official Rules

To qualify and be eligible for prizes, your submission must strictly adhere to the following rules:

### Core Mission

Ship an **autonomous agent** that performs **real work on the open web**.

### Team Size

Maximum of **3 people** per team.

### Timeline

All projects must be built during the event, with the final deadline for **Devpost submission at 4:30 PM**.

### Technical Implementation

You must integrate **at least 3 sponsor tools** into your application's logic.

### Mandatory Output

Your agent must publish its final result strictly to a file named **`cited.md`**.

### Monetization

You are required to integrate an **agent payment rail** (e.g., x402, MPP, CDP, or agentic.market).

### Actionable Demo

During your **3-minute pitch**, you cannot rely on slides or documents; the project must be **functional** and demonstrate the agent working **live**.

### Submission Assets

Your Devpost submission must include:

- A **3-minute demo video**
- A link to a **public GitHub repository**
- All project details completed on the **Devpost page**

---

## Sponsor Toolkit & Capabilities

Leverage these partners to fulfill your 3-tool minimum and maximize your chances of winning specific sponsor prizes:

| Partner | Key Capability | Potential Use Case |
|---------|----------------|-------------------|
| **Cursor** | AI code editor | Rapidly build/refactor your frontend and backend code. |
| **Tavily AI** | Agentic web search | Scour the web for real-time, grounded data for your agent. |
| **ClickHouse** | Leading database for AI | Store high-volume vector data or agent logs (integrates with Langfuse). |
| **Prometheux** | Ontology for Data & AI | Create deterministic logical reasoning / "context as code" to prevent hallucinations. |
| **Gensyn** | Network for machine intelligence | Ensure verifiable, reproducible AI inference. |
| **ElevenLabs** | Voice AI | Generate realistic voice briefs or summaries of agent findings. |
| **Twilio** | Communications | Trigger SMS notifications or automated outreach. |
| **Tessl** | Development Platform | Leverage for specialized development workflows. |
| **Senso.ai** | AI Infrastructure | Utilize for specific integration tasks. |

---

## Quick Checklist

- [ ] Autonomous agent doing real work on the open web
- [ ] Team size ≤ 3
- [ ] Built during the event; Devpost submitted by **4:30 PM**
- [ ] ≥ 3 sponsor tools integrated into application logic
- [ ] Final output published to **`cited.md`**
- [ ] Agent payment rail integrated (x402, MPP, CDP, or agentic.market)
- [ ] Live demo ready (no slides for the 3-minute pitch)
- [ ] Devpost: demo video + public GitHub repo + completed project details

---

## How Sidequest meets this

| Requirement | Sidequest implementation |
|-------------|-------------------------|
| **Autonomous agent on the open web** | Tavily live search enriched by Luma API + Eventbrite scraping; agent orchestrates discover → filter → plan |
| **≥ 3 sponsor tools** | **Tavily**, **Prometheux**, **Gemini**, **Langfuse** (ClickHouse-backed), **Firebase** — integrated in application logic, not bolt-on |
| **Mandatory `cited.md`** | Every plan writes filter stats, verified candidates, itinerary, and source URLs to repo-root `cited.md` |
| **Agent payment rail** | **MPP** scaffold on `/api/plan` (`SKIP_MPP=true` default for hackathon; enable with MPP keys) |
| **Live functional demo** | **`demo` branch** — Firebase App Hosting at `https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app` with guided **Live Demo** UI; backend on Cloud Run with `USE_DEMO_DATA=true` for reliability |
| **Prometheux track** | Deterministic logic filter gate before Gemini; `filter_stats.filter_method` shows `sdk` (live) or `demo` (seeded fallback) |
| **Pitch assets** | [`VIDEO_PITCH.md`](VIDEO_PITCH.md) script; no slides required — screen recording of working app |
