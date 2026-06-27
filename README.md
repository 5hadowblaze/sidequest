# Sidequest

**Multiagents Hackathon (June 2026)** — deterministic autonomous agent for verified weekend itineraries. **Sidequest — your weekend, verified.**

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Product Sidequest — map-first discover/plan, production deploy defaults (`NEXT_PUBLIC_ENABLE_DEMO=false`). |
| `demo` | Presenter autoplay (DemoRunner), pitch assets, and guided live-demo UI for hackathon recordings. |


## Core differentiator: Prometheux / Vadalog

Most agents let an LLM decide what’s “valid.” This project **separates search from verification**:

1. **Tavily** — live web search for events + restaurants (non-deterministic retrieval).
2. **Prometheux / Vadalog** — **deterministic constraint gate** over normalized facts (budget, location, diet, activities, accessibility). Only rows that pass Vadalog rules continue.
3. **Gemini** — formats a human-readable itinerary from **Prometheux-verified rows only** (no invented venues).
4. **Langfuse** — full trace of agent → tools → generation.
5. **`cited.md`** — published table showing filter stats, verified candidates, and cited sources.

```
Tavily (search) → Prometheux/Vadalog (deterministic filter) → Gemini (format only) → cited.md
```

### Vadalog ontology (judge-friendly)

| Fact / rule | Purpose |
|-------------|---------|
| `candidate(id, type, title, url, price, loc, tags, snippet)` | Tavily rows injected as facts |
| `max_budget(N)` | Per-item budget ceiling |
| `target_location("austin")` | Location substring match in `loc` or `title` |
| `required_diet_token("vegan")` | Diet keyword match in tags/title/snippet |
| `required_activity_token("music")` | Activity tag match |
| `required_access_token("wheelchair")` | Accessibility keyword match |
| `matches(...)` | Output predicate — only passing rows |

Filter method is always `sdk` via `prometheux_chain` — no REST or Python fallback.

## Prometheux track — demo talking points

1. **Anti-hallucination gate** — Gemini never sees raw Tavily results; only Vadalog `matches` rows.
2. **Explainable constraints** — Rules are explicit Datalog, not prompt engineering.
3. **`prometheux_chain` SDK** — `px.config.set("PMTX_TOKEN", …)`, `save_concept`, `run_concept` on concept `matches`.
4. **Observable filter stats** — API returns `filter_stats: { candidates_in, candidates_out, filter_method }`.
5. **`cited.md` audit trail** — Shows which candidates passed Vadalog rules before itinerary formatting.

## Stack

| Layer | Technology |
| --- | --- |
| UI | Next.js, TypeScript, Tailwind CSS, Leaflet + OpenStreetMap |
| Live search | Tavily AI |
| **Deterministic filter** | **Prometheux / Vadalog** (`prometheux_chain`) |
| Itinerary formatting | Gemini (`gemini-3.1-pro-preview`) |
| Observability | Langfuse |
| Agentic payments | MPP — **scaffolded only, optional** (`SKIP_MPP=true` default) |
| Backend | Python FastAPI |

## Sidequest UI

The app opens to **Sidequest** — a map-first experience for discovering local events and planning verified itineraries.

| Flow | What happens |
|------|----------------|
| **Sign in** | Google via Firebase (`frontend/lib/auth.ts`). The Google account picker shows app name **Sidequest** (not “Perfect Weekend Planner”); “continue to” may still show `localhost` or `perfect-weekend-planner.firebaseapp.com`. Requests `calendar.readonly` scope; access token stored in session for free-slot lookup. Falls back to mock auth + localStorage when Firebase env vars are unset. See `Design.md` → Google Sign-In branding. |
| **Onboarding** | One-time profile modal (`ProfileOnboarding`) — home city, budget, diet, activities, accessibility. Saved to Firestore `users/{uid}` (or localStorage in mock mode). |
| **Calendar** | `frontend/lib/calendar.ts` calls Google Calendar `freeBusy` for upcoming Sat/Sun, derives morning / afternoon / evening free slots. Mock slots when calendar token unavailable. |
| **Discover** | `SidequestExplorer` → `GET /api/discover` → FastAPI `/discover` with profile constraints + `calendar_slots` JSON. Tavily search + Prometheux Vadalog filter; cards show `passed_rules` badges (Budget, Location, Diet, Free saturday afternoon, …). |
| **Plan** | Select an event → **Plan weekend** → `POST /api/plan` (MPP skipped when `SKIP_MPP=true`) with profile + `calendar_slots`. Returns itinerary + `filter_stats`. |

Key files: `frontend/components/SidequestExplorer.tsx`, `EventCard.tsx`, `ExplorerMap.tsx`, `frontend/lib/discover-client.ts`, `frontend/lib/calendar.ts`, `backend/discover.py`.

Type-check: `cd frontend && npx tsc --noEmit`

## Project structure

```
frontend/     # Sidequest UI + /api/discover + /api/plan proxy (MPP optional)
backend/      # discover.py + agent.py: Tavily → Prometheux → Gemini → cited.md
cited.md      # Generated output at repo root
Design.md     # Full PDD + architecture
```

## Prometheux setup (required)

The deterministic filter **requires** the Prometheux SDK and a valid API token. There is no offline mirror.

1. **Sign up** at [platform.prometheux.ai](https://platform.prometheux.ai).
2. **Copy your API token** into `PMTX_TOKEN` in `.env.local` at the repo root.
3. **Set `JARVISPY_URL`** if the SDK docs require it:  
   `https://platform.prometheux.ai/jarvispy/{org}/{username}`
4. **Leave `PMTX_PROJECT_ID=weekend-planner`** — default namespace; no manual project creation.

Restart the backend after updating env vars.

## Getting started

Copy `.env.example` to `.env.local` (repo root). **MPP is off by default** — no wallet setup needed for the demo.

For hackathon demos when Prometheux returns `ENGINE_BUSY` or APIs are flaky, add to `.env.local`:

```bash
USE_DEMO_DATA=true
```

This serves rich seeded events (London, NYC, Austin, etc.) with local rule badges and demo weekend plans — no Tavily/Gemini/Prometheux required. Leave unset (or `false`) to use the live path when keys are configured.

```bash
# Terminal 1 — backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000`:

1. Sign in with Google (or demo mode without Firebase keys).
2. Complete onboarding — home city, budget, diet, activities.
3. Browse the map + event cards; note Prometheux rule badges and filter stats in the sidebar header.
4. Select an event → **Plan weekend** for a full itinerary.

Verify backend:

- `curl http://localhost:8000/health` → `{ "ok": true }`
- Discover with constraints:  
  `curl "http://localhost:8000/discover?location=Austin,%20TX&budget=150&diet=vegan&activities=music&calendar_slots=%5B%7B%22date%22%3A%22saturday%22%2C%22period%22%3A%22afternoon%22%7D%5D"`
- `cited.md` at repo root after planning lists verified candidates + itinerary
- Langfuse trace: `search-weekend-options` → `filter-with-prometheux` → `build-itinerary`

### Required keys

| Variable | Required | Notes |
|----------|----------|-------|
| `USE_DEMO_DATA` | no | Set `true` for seeded demo events/plans (bypasses live APIs) |
| `GEMINI_API_KEY` | yes* | Itinerary formatting (*not required when `USE_DEMO_DATA=true`) |
| `TAVILY_API_KEY` | yes* | Live search (*not required when `USE_DEMO_DATA=true`) |
| `PMTX_TOKEN` | yes* | Prometheux SDK — Vadalog filter gate (*not required when `USE_DEMO_DATA=true`) |
| `JARVISPY_URL` | maybe | JarvisPy endpoint if SDK requires it |
| `PMTX_PROJECT_ID` | no | Defaults to `weekend-planner` |
| `LANGFUSE_*` | optional | Tracing |
| `MPP_*` | optional | Set `SKIP_MPP=false` to enable payment gate |

## Deploy (Firebase App Hosting + Cloud Run)

The **Next.js frontend** deploys to [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (SSR). The **Python FastAPI backend** runs separately — for production, deploy it to **Cloud Run** and point the frontend at that URL.

### Prerequisites (one-time, Firebase console)

1. **Blaze plan** — App Hosting requires billing: [upgrade project](https://console.firebase.google.com/project/perfect-weekend-planner/overview?purchaseBillingPlan=metered).
2. **Enable App Hosting** — Firebase console → **Build** → **App Hosting** → create backend `weekend-explorer` (or let the first CLI deploy create it).
3. **Authorized domains** — `localhost`, `perfect-weekend-planner.firebaseapp.com`, and `perfect-weekend-planner.web.app` are already set for local + default hosting. After App Hosting deploy, add your backend URL (e.g. `weekend-explorer--perfect-weekend-planner.us-central1.hosted.app`) in [Authentication → Settings](https://console.firebase.google.com/project/perfect-weekend-planner/authentication/settings). See `Design.md` for API verify/update one-liners.
4. **Firestore** — rules/indexes deploy with `firebase deploy --only firestore` if not already applied.

### Configure environment

Edit `frontend/apphosting.yaml` before deploy:

| Variable | Where | Notes |
|----------|-------|-------|
| `BACKEND_URL` | `apphosting.yaml` or secret | Cloud Run URL for FastAPI (e.g. `https://weekend-api-xxxxx.run.app`) |
| `NEXT_PUBLIC_FIREBASE_*` | App Hosting env / secrets | Web app config from Project Settings |
| `SKIP_MPP` | `apphosting.yaml` | Keep `true` for hackathon demo |

For sensitive keys, use Secret Manager:

```bash
npx -y firebase-tools@latest apphosting:secrets:set BACKEND_URL
npx -y firebase-tools@latest apphosting:secrets:grantaccess BACKEND_URL --backend weekend-explorer
```

Then reference the secret in `frontend/apphosting.yaml` instead of a plain `value`.

### Deploy frontend (App Hosting)

From the **repo root** (not `frontend/`):

```bash
# Install & verify build locally
cd frontend && npm install && npm run build

# Deploy App Hosting backend (uses firebase.json → rootDir: frontend)
cd .. && npx -y firebase-tools@latest deploy --only apphosting
```

`firebase.json` sets `apphosting.rootDir` to `frontend` and `backendId` to `weekend-explorer`. Config file: `frontend/apphosting.yaml`.

### Deploy backend (Cloud Run, separate)

The hackathon backend is **not** bundled into App Hosting. Example:

```bash
cd backend
gcloud run deploy weekend-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=...,TAVILY_API_KEY=...,PMTX_TOKEN=..."
```

Set `BACKEND_URL` in `frontend/apphosting.yaml` to the Cloud Run service URL, then redeploy the frontend.

### Local map

The explorer map uses **Leaflet + OpenStreetMap** — no Google Maps API key required.

## License

Private hackathon submission.
