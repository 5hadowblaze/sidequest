# Sidequest — Product Design Document

Hackathon submission for **Multiagents Hackathon (June 2026)**. **Sidequest — your weekend, verified.** Built for the **Prometheux track**: deterministic constraint filtering before any LLM formatting.

> **Cursor instruction:** Keep this file updated as features land. When adding endpoints, env vars, or pipeline steps, update the relevant sections here.

---

## Hackathon goal

Build a **deterministic autonomous agent** that plans a verified weekend itinerary from user constraints. The agent must:

1. Ingest **live event data** — Luma API, Eventbrite scraping, plus **Tavily** web search (Instagram, social, Google, and other listings).
2. Filter candidates **deterministically** with Prometheux — **the core differentiator** (no LLM in the filter gate).
3. Format a human-readable itinerary with **Gemini** using **only** Prometheux-verified rows.
4. Publish a **cited markdown table** to `cited.md` showing filter stats + verified candidates + itinerary.
5. Expose **Langfuse traces** (backed by ClickHouse) for every tool, generation, and agent step.
6. *(Optional scaffold)* MPP micro-payments on the Next.js API route — **disabled by default** (`SKIP_MPP=true`).

### Acceptance criteria

| # | Criterion |
|---|-----------|
| 1 | User submits location, budget, diet, activities (+ optional accessibility) via Next.js form |
| 2 | Backend returns `{ itinerary, cited_path, trace_id, filter_stats }` — no wallet required when `SKIP_MPP=true` |
| 3 | `filter_stats` reports `candidates_in`, `candidates_out`, `filter_method: "sdk"` (live) or `"demo"` (seeded / fallback) |
| 4 | `cited.md` shows Prometheux filter summary, verified candidate table, and itinerary with source URLs |
| 5 | Langfuse trace shows nested `agent` → `tool` / `generation` observations |
| 6 | Gemini never receives unfiltered Tavily candidates (Prometheux gate) |

---

## Event sources and Tavily enrichment

| Source | Mechanism | Role |
|--------|-----------|------|
| **Luma API** | Curated community / hackathon events | Primary structured feed |
| **Eventbrite** | Web scraping for ticketed listings | Secondary structured feed |
| **Tavily** | Agentic web search | Enriches index with Instagram, social posts, Google results, and other live listings |

Pipeline UI surfaces Luma · Eventbrite → Tavily → Prometheux in discover stats and loading states.

---

## Prometheux constraint ontology

### Input facts (from Tavily)

Each search result becomes a Prometheux fact (internally expressed as Datalog in `prometheux_filter.py`):

```text
candidate("evt_1", "event", "Jazz Fest", "https://...", 25, "Austin, TX", "outdoor,music", "Weekend jazz...").
candidate("rst_1", "restaurant", "Green Bowl", "https://...", 18, "Austin, TX", "vegan", "Plant-based...").
```

### Constraint facts (from user request)

```text
max_budget(150).
target_location("austin").
has_diet_constraints.
required_diet_token("vegan").
has_activity_constraints.
required_activity_token("music").
has_access_constraints.
required_access_token("wheelchair").
```

### Rules (deterministic gate)

| Rule | Logic |
|------|-------|
| `budget_ok` | `Price =< max_budget` |
| `loc_ok` | `target_location` substring in `Loc` or `Title` |
| `diet_ok` | If diet constraints exist, at least one `required_diet_token` matches tags/title/snippet |
| `activity_ok` | If activity constraints exist, at least one `required_activity_token` matches |
| `access_ok` | If accessibility constraints exist, at least one `required_access_token` matches |
| `slot_ok` / `event_fits_slot` | If `free_slot` facts exist, event date/period text must overlap a user free slot |
| `matches` | All of the above must hold |

### Calendar free-slot facts

User calendar availability is injected as Prometheux facts (morning / afternoon / evening):

```text
free_slot("saturday", "afternoon").
free_slot("sunday", "morning").
has_calendar_constraints.
```

`event_fits_slot/1` matches when the event `date_hint`, title, or snippet mentions the slot day (including `sat`/`sun`/`weekend` aliases) and, when a period is mentioned, the period (`morning`, `afternoon`, `evening`/`night`/`tonight`). If no period is mentioned, day-only match is sufficient.

Per-card `passed_rules` returned to the UI include tokens like `budget_ok`, `diet_match`, and `free_slot_saturday_afternoon`.

Output predicate: `@output("matches")`.

### SDK usage (`prometheux_chain`) — live path

Prometheux is **SDK-only** on the live path. When `USE_DEMO_DATA=true` or Prometheux fails, the backend serves seeded data with `filter_method: "demo"`.

```python
import prometheux_chain as px

px.config.set("PMTX_TOKEN", os.environ["PMTX_TOKEN"])
# Optional if SDK docs require it:
# px.config.set("JARVISPY_URL", "https://api.prometheux.ai/jarvispy/{org}/{username}")
px.save_concept(project_id="weekend-planner", code=logic_program)
result = px.run_concept(project_id="weekend-planner", concept_name="matches")
```

#### Token setup

1. Sign up at [platform.prometheux.ai](https://platform.prometheux.ai).
2. Copy your API token into `PMTX_TOKEN` in root `.env.local`.
3. If the SDK requires it, set `JARVISPY_URL` to  
   `https://api.prometheux.ai/jarvispy/{org}/{username}` (use your org and username from the platform).
4. Leave `PMTX_PROJECT_ID=weekend-planner` — the SDK creates/uses this namespace automatically; no manual project setup.

---

## Demo vs live backend behavior

| Mode | Trigger | Behavior | `filter_method` |
|------|---------|----------|-----------------|
| **Demo data** | `USE_DEMO_DATA=true` in root `.env.local` | Seeded events/plans (London, NYC, Austin, …); no Tavily/Gemini/Prometheux required | `"demo"` |
| **Live** | `USE_DEMO_DATA` unset/false + valid keys | Tavily search → Prometheux SDK filter → Gemini format | `"sdk"` |
| **Fallback** | Live path but Prometheux unavailable (`ENGINE_BUSY`, SDK error, missing token) | Seeded pipeline with local rule badges | `"demo"` |

Frontend mirrors demo mode via `NEXT_PUBLIC_USE_DEMO_DATA` (loading copy) and `NEXT_PUBLIC_ENABLE_DEMO` (Live Demo button on `demo` branch).

---

## Constraint schema

Request body for `POST /plan` (and frontend form):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | string | yes | City or area (e.g. `"Austin, TX"`) |
| `budget` | number | yes | Max spend per item / day (USD) |
| `diet` | string | yes | Dietary constraints (e.g. `"vegan, gluten-free"`) |
| `activities` | string | yes | Activity preferences (e.g. `"outdoor, music, museums"`) |
| `accessibility` | string | no | Accessibility needs (e.g. `"wheelchair accessible"`) |

### Normalized candidate schema (Tavily → Prometheux)

```json
{
  "id": "evt_1",
  "type": "event" | "restaurant",
  "title": "Jazz Fest",
  "url": "https://...",
  "snippet": "...",
  "price_estimate": 25,
  "location": "Austin",
  "tags": "outdoor,music"
}
```

---

## Data flow

### Discover (`GET /discover`) — Phase A

```mermaid
sequenceDiagram
    participant User
    participant Explorer as SidequestExplorer
    participant API as api_discover_route
    participant FastAPI as backend_main
    participant Sources as Luma_Eventbrite
    participant Tavily
    participant Prometheux

    User->>Explorer: open map (profile loaded)
    Explorer->>API: GET /api/discover?location&budget&diet&...
    API->>FastAPI: GET /discover (same query params)
    FastAPI->>Sources: event index
    FastAPI->>Tavily: enrich + weekend search
    FastAPI->>Prometheux: logic filter (SDK when live)
    Note over FastAPI,Prometheux: free_slot facts + constraint facts
    FastAPI-->>API: events + passed_rules + filter_stats
    API-->>Explorer: DiscoverResponse
    Explorer->>User: EventCard rule badges
```

When `budget` is provided, discover runs the Prometheux gate on the live path (SDK). Optional query params: `diet`, `activities`, `accessibility`, `calendar_slots` (JSON array of `{date, period}`). Response includes `filter_stats: { candidates_in, candidates_out, filter_method }` and per-event `passed_rules`, `prometheux_verified`, `match_score`.

When Prometheux is unavailable or `USE_DEMO_DATA=true`, discover returns seeded events with locally computed `passed_rules` and `filter_method: "demo"`.

### Plan (`POST /plan`)

```mermaid
sequenceDiagram
    participant User
    participant NextUI as NextJS_page
    participant API as api_plan_route
    participant FastAPI as backend_main
    participant Agent as agent_py
    participant Tavily
    participant Prometheux
    participant Gemini
    participant Langfuse
    participant File as cited_md

    User->>NextUI: location, budget, constraints
    NextUI->>API: POST /api/plan
    Note over API: SKIP_MPP=true by default
    API->>FastAPI: POST /plan
    FastAPI->>Agent: run_weekend_planner()
    Agent->>Tavily: parallel events + restaurants search
    Agent->>Prometheux: inject facts + logic filter
    Note over Agent,Langfuse: @observe on each step
    Agent->>Gemini: format verified rows only
    Agent->>File: write cited.md
    Agent-->>FastAPI: itinerary + filter_stats
    FastAPI-->>API: 200 + body
    API-->>NextUI: plan result
```

### Tool pipeline

1. **Luma + Eventbrite** — structured event feeds into the index.
2. **Tavily** — parallel web search (weekend events + restaurants; Instagram/social/Google enrichment).
3. **Fact injection** — Tavily JSON → Prometheux `candidate(...)` facts + constraint facts.
4. **Prometheux** — deterministic `matches` predicate; only passing rows continue (or demo fallback).
5. **Gemini** (`gemini-3.1-pro-preview`) — narrative / structured JSON from **verified rows only**.
6. **`cited.md`** — filter stats + verified candidates table + itinerary + Sources section.

---

## Prometheux track — judge demo script

1. Show form submit → UI displays `16 → 5` style filter stats with `filter_method: sdk` (live) or `demo` (seeded).
2. Open Langfuse trace: highlight `filter-with-prometheux` between Tavily and Gemini.
3. Open `cited.md`: point to **Verified candidates** section (Prometheux-passed rows).
4. Explain: changing budget/diet in the form changes which rows survive — **deterministic**, not prompt luck.
5. *(Optional)* Set `SKIP_MPP=false` to show MPP scaffold on `/api/plan`.

---

## Architecture

| Layer | Path | Technology |
|-------|------|------------|
| UI | `frontend/` | Next.js, TypeScript, Tailwind |
| API proxy | `frontend/app/api/plan/route.ts` | Direct proxy (MPP optional) |
| Agent API | `backend/main.py` | FastAPI on `:8000` |
| Orchestrator | `backend/agent.py` | Tavily + Prometheux + Gemini + Langfuse |
| Discover | `backend/discover.py` | Tavily search + Prometheux filter for map cards |
| Filter | `backend/prometheux_filter.py` | Prometheux logic via `prometheux_chain` |
| Demo fallback | `backend/demo_data.py` | Seeded events/plans when `USE_DEMO_DATA` or SDK failure |
| Output | `backend/format_output.py` | `cited.md` writer |

---

## Firebase setup

Firebase backs **Google Sign-In**, **Firestore user profiles** for one-time onboarding, and optional Google Calendar access when a token is available.

| Item | Value |
|------|-------|
| Project ID | `perfect-weekend-planner` (internal; do not rename) |
| Display name | **Sidequest** (Firebase console + GCP project name; shown in Google account picker when OAuth consent app name is set) |
| Console | https://console.firebase.google.com/project/perfect-weekend-planner/overview |
| Web app | `perfect-weekend-planner-web` |
| App ID | `1:1078602360488:web:116bf6e78076cc582a449d` |
| Firestore region | `nam5` (default database) |
| App Hosting URL | `https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app` |

### Repo files

| Path | Purpose |
|------|---------|
| `firebase.json` | Firestore rules/indexes + Auth (`oAuthBrandDisplayName`: **Sidequest**, Google provider, authorized domains) |
| `.firebaserc` | Active project alias |
| `firestore.rules` | Users may read/write only `users/{uid}` where `uid == request.auth.uid` |
| `frontend/lib/firebase.ts` | App init from `NEXT_PUBLIC_FIREBASE_*` env vars |
| `frontend/lib/auth.ts` | Google sign-in popup — default Firebase scopes only (no `calendar.readonly` on sign-in) |
| `frontend/lib/calendar.ts` | Google Calendar `freeBusy` → weekend slots when token exists; mock slots otherwise |
| `frontend/lib/firestore.ts` | `UserProfile` save/load (`homeCity`, `budget`, `diet`, `activities`, `accessibility`) |
| `frontend/lib/profile.ts` | Profile store abstraction (Firestore or localStorage) |


### Google Sign-In branding (what users see)

Google’s account chooser typically shows:

1. **App name** — **Sidequest** (from OAuth consent screen + Firebase Auth Google provider config).
2. **“Continue to …”** — still shows the auth host (e.g. `perfect-weekend-planner.firebaseapp.com` or `localhost` during dev). That hostname is normal; it is not the product name.

**Configured in repo** (`firebase.json` → `auth.providers.googleSignIn.oAuthBrandDisplayName`):

```json
"oAuthBrandDisplayName": "Sidequest"
```

**Deployed via CLI** (2026-06-26):

```bash
npx -y firebase-tools@latest deploy --only auth --project perfect-weekend-planner
```

This calls Firebase provisioning with `publicDisplayName: "Sidequest"` for Google sign-in.

**Also updated via CLI/API** (project ID unchanged):

| Setting | Command / API | Result |
|---------|----------------|--------|
| GCP project display name | `gcloud projects update perfect-weekend-planner --name="Sidequest"` | Console project title **Sidequest** |
| Firebase project display name | `PATCH https://firebase.googleapis.com/v1beta1/projects/perfect-weekend-planner?updateMask=displayName` body `{"displayName":"Sidequest"}` | `firebase projects:list` shows **Sidequest** |
| Authorized domains (+ `127.0.0.1`) | Identity Toolkit Admin API `PATCH .../config?updateMask=authorizedDomains` | Matches `firebase.json` local dev |

**Manual step (required for OAuth consent app title on personal GCP projects):** IAP OAuth brand APIs require an organization, so set the **OAuth consent screen → App name** to **Sidequest** in [Google Cloud Console → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent?project=perfect-weekend-planner). Save; Google may take a few minutes to propagate. Support email should match `firebase.json` (`dzakwan1844@gmail.com`).

Users should **not** see “Perfect Weekend Planner” after the above; they should see **Sidequest** as the app name, with “continue to” showing the Firebase auth domain.

### Authorized domains (Google Sign-In)

Local dev and hosting URLs must appear under **Authentication → Settings → Authorized domains**. As of 2026-06-26 the project lists:

- `localhost`
- `127.0.0.1`
- `perfect-weekend-planner.firebaseapp.com`
- `perfect-weekend-planner.web.app`
- `weekend-explorer--perfect-weekend-planner.us-central1.hosted.app`

**Verify** (requires `gcloud auth login` with access to the project):

```bash
curl -sS -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: perfect-weekend-planner" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/perfect-weekend-planner/config" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('authorizedDomains'))"
```

**Add a domain** (Firebase CLI has no `auth:settings` command; use Identity Toolkit Admin API):

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: perfect-weekend-planner" \
  -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/perfect-weekend-planner/config?updateMask=authorizedDomains" \
  -d '{"authorizedDomains":["localhost","127.0.0.1","perfect-weekend-planner.firebaseapp.com","perfect-weekend-planner.web.app","YOUR_HOST"]}'
```

Console: [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/perfect-weekend-planner/authentication/settings).

### Deploy / update Firebase backend

```bash
# From repo root (logged in via firebase login)
npx -y firebase-tools@latest deploy --only firestore
npx -y firebase-tools@latest deploy --only auth
```

### Frontend env

Copy `frontend/.env.local.example` → `frontend/.env.local` and fill `NEXT_PUBLIC_FIREBASE_*` from **Project settings → Your apps → Web app**. CLI one-liner:

```bash
npx -y firebase-tools@latest apps:sdkconfig WEB 1:1078602360488:web:116bf6e78076cc582a449d --project perfect-weekend-planner
```

Map SDK config keys to env vars: `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`, `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, etc.

### Calendar behavior

- **Sign-in** (`frontend/lib/auth.ts`) does **not** request `calendar.readonly` — only default Firebase Google scopes.
- **`demo` branch:** onboarding includes a **pseudo calendar connect** step (UI-only; no OAuth scope).
- **`main` branch:** `frontend/lib/calendar.ts` uses Google Calendar `freeBusy` when an access token exists; otherwise **mock weekend slots**.
- **Enable Google Calendar API** in [Google Cloud Console](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=perfect-weekend-planner) if you add calendar OAuth later.

### User profile schema (`users/{uid}`)

| Field | Type | Notes |
|-------|------|-------|
| `uid` | string | Must match Auth UID / doc ID |
| `homeCity` | string | e.g. `"Austin, TX"` |
| `budget` | number | USD, > 0 |
| `diet` | string | Comma-separated preferences |
| `activities` | string | Comma-separated preferences |
| `accessibility` | string? | Optional |
| `onboardingCompleted` | boolean | Set `true` after onboarding |
| `createdAt` / `updatedAt` | timestamp | Server timestamps |

---

## Sidequest UI

Map-first Next.js app at `/` (`SidequestExplorer`). Leaflet + OpenStreetMap for pins; sidebar for event cards and detail.

| Component | Path | Role |
|-----------|------|------|
| `SidequestExplorer` | `frontend/components/SidequestExplorer.tsx` | Orchestrates auth, profile, calendar slots, discover, plan |
| `ExplorerMap` | `frontend/components/ExplorerMap.tsx` | Dynamic Leaflet map with event markers |
| `EventCard` | `frontend/components/EventCard.tsx` | Card with image, category, Prometheux rule badges |
| `EventDetail` | `frontend/components/EventDetail.tsx` | Selected event + Plan weekend CTA |
| `ProfileOnboarding` | `frontend/components/ProfileOnboarding.tsx` | One-time constraint capture modal |
| `PlanResultsPanel` | `frontend/components/PlanResultsPanel.tsx` | Itinerary overlay after `/api/plan` |

| Library | Path | Role |
|---------|------|------|
| `auth.ts` | `frontend/lib/auth.ts` | Firebase Google sign-in (default scopes) |
| `calendar.ts` | `frontend/lib/calendar.ts` | Calendar slots or mock fallback |
| `discover-client.ts` | `frontend/lib/discover-client.ts` | Builds discover query from profile + calendar slots |
| `profile.ts` | `frontend/lib/profile.ts` | Firestore profile store (localStorage fallback when Firebase unset) |
| `firestore.ts` | `frontend/lib/firestore.ts` | `users/{uid}` read/write |

**Discover request shape** (proxied by `frontend/app/api/discover/route.ts`):

```
GET /api/discover?location=Austin,%20TX&budget=150&diet=vegan&activities=music&accessibility=wheelchair&calendar_slots=[{"date":"saturday","period":"afternoon"}]
```

**Plan request shape** includes the same `calendar_slots` array in the JSON body.

When Prometheux SDK is unavailable, discover falls back to seeded events with locally computed `passed_rules` and `filter_method: "demo"`. Full SDK filter sets `prometheux_verified: true` and `filter_method: "sdk"`.

---

## Environment variables

### File locations

| File | Scope |
|------|-------|
| Root `.env.local` | Backend: `USE_DEMO_DATA`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `PMTX_TOKEN`, `JARVISPY_URL`, `PMTX_PROJECT_ID`, `LANGFUSE_*`, `BACKEND_URL`, `SKIP_MPP`, `MPP_*` |
| `frontend/.env.local` | Frontend: all `NEXT_PUBLIC_*`, `NEXT_PUBLIC_ENABLE_DEMO`, `NEXT_PUBLIC_USE_DEMO_DATA`, `BACKEND_URL`, `SKIP_MPP` |

Copy root `.env.example` → `.env.local` and `frontend/.env.local.example` → `frontend/.env.local`.

| Variable | Service | Used by |
|----------|---------|---------|
| `USE_DEMO_DATA` | — | Backend — seeded events/plans; `filter_method: "demo"` |
| `NEXT_PUBLIC_ENABLE_DEMO` | — | Frontend — Live Demo button / DemoRunner (`demo` branch) |
| `NEXT_PUBLIC_USE_DEMO_DATA` | — | Frontend — shorter discover loading copy when demo data active |
| `SKIP_MPP` | — | Next.js API — `true` (default) skips MPP |
| `NEXT_PUBLIC_SKIP_MPP` | — | Browser client — mirrors server default |
| `MPP_SECRET_KEY` | MPP (optional) | Next.js API route when `SKIP_MPP=false` |
| `MPP_RECIPIENT` | MPP (optional) | Next.js API route |
| `MPP_CURRENCY` | MPP (optional) | Next.js API route |
| `BACKEND_URL` | — | Next.js → FastAPI (default `http://localhost:8000`) |
| `GEMINI_API_KEY` | Google AI | `agent.py` — itinerary generation |
| `TAVILY_API_KEY` | Tavily | `agent.py` — live search |
| `PMTX_TOKEN` | Prometheux | Live `/plan` and filtered `/discover` — `prometheux_filter.py` SDK auth |
| `JARVISPY_URL` | Prometheux | Optional: `https://api.prometheux.ai/jarvispy/{org}/{username}` |
| `PMTX_PROJECT_ID` | Prometheux | Project namespace (default `weekend-planner`) |
| `LANGFUSE_PUBLIC_KEY` | Langfuse | Auto-configured SDK |
| `LANGFUSE_SECRET_KEY` | Langfuse | Auto-configured SDK |
| `LANGFUSE_HOST` | Langfuse | Default `https://cloud.langfuse.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase | Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase | Web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase | `perfect-weekend-planner` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase | Web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase | Web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase | Web app config |

**MPP:** Scaffolded only. `SKIP_MPP=true` is the default — no wallet for hackathon demo. Set `SKIP_MPP=false` + MPP keys to enable the payment gate.

---

## Local runbook

```bash
# Terminal 1 — backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Health check: `curl http://localhost:8000/health` → `{ "ok": true }`

---

## Risk mitigations

| Risk | Mitigation |
|------|------------|
| MPP wallet not configured | `SKIP_MPP=true` default; route proxies directly to backend |
| Prometheux latency / SDK issues | Seeded fallback with `filter_method: "demo"`; or set `USE_DEMO_DATA=true` for demos |
| Gemini invents venues | Prometheux filter is gate; prompt forbids invented venues |
| Wrong `cited.md` path | `Path(__file__).resolve().parent.parent / "cited.md"` |
| Langfuse SDK drift | `from langfuse import observe, propagate_attributes` |
