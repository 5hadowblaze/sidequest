# Sidequest

**Multiagents Hackathon (June 2026)** — deterministic autonomous agent for verified weekend itineraries. **Sidequest — your weekend, verified.**

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Product Sidequest — map-first discover/plan, production deploy defaults (`NEXT_PUBLIC_ENABLE_DEMO=false`). |
| `demo` | Presenter autoplay (DemoRunner), pitch assets, guided **Live Demo** button, and hackathon recording UI. |

## Quick start

```bash
# Presenter / hackathon recording (seeded data, Live Demo UI)
git checkout demo
# root .env.local: USE_DEMO_DATA=true
# frontend/.env.local: NEXT_PUBLIC_ENABLE_DEMO=true (default on demo)

# Product build (live APIs when keys configured)
git checkout main
# frontend/.env.local: NEXT_PUBLIC_ENABLE_DEMO=false
```

Copy env templates:

- **Backend keys** → repo root `.env.local` (from `.env.example`)
- **Frontend `NEXT_PUBLIC_*`** → `frontend/.env.local` (from `frontend/.env.local.example`)

```bash
# Terminal 1 — backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000` → sign in → complete onboarding → browse map → **Plan weekend**.

On **`demo`**, set `USE_DEMO_DATA=true` in root `.env.local` for reliable seeded events and use the **Live Demo** button for guided autoplay (pitch script: [`VIDEO_PITCH.md`](VIDEO_PITCH.md) on the `demo` branch). On **`main`**, calendar free slots use **mock slots** when no Google Calendar token is available.

## Core differentiator: Prometheux logic filter

Most agents let an LLM decide what’s “valid.” This project **separates search from verification**:

1. **Event sources + Tavily** — Luma API and Eventbrite scraping feed the index; **Tavily** enriches with live web search (Instagram, social posts, Google, and other listings).
2. **Prometheux** — **deterministic constraint gate** over normalized facts (budget, location, diet, activities, accessibility, calendar slots). Only rows that pass Prometheux logic rules continue.
3. **Gemini** — formats a human-readable itinerary from **Prometheux-verified rows only** (no invented venues).
4. **Langfuse + ClickHouse** — full trace of agent → tools → generation.
5. **`cited.md`** — published table showing filter stats, verified candidates, and cited sources.

```
Luma · Eventbrite → Tavily (web search) → Prometheux (logic filter) → Gemini (format only) → cited.md
```

### Prometheux constraint ontology (judge-friendly)

| Fact / rule | Purpose |
|-------------|---------|
| `candidate(id, type, title, url, price, loc, tags, snippet)` | Tavily rows injected as facts |
| `max_budget(N)` | Per-item budget ceiling |
| `target_location("austin")` | Location substring match in `loc` or `title` |
| `required_diet_token("vegan")` | Diet keyword match in tags/title/snippet |
| `required_activity_token("music")` | Activity tag match |
| `required_access_token("wheelchair")` | Accessibility keyword match |
| `matches(...)` | Output predicate — only passing rows |

**Filter method:** live Prometheux path → `filter_method: "sdk"`; demo mode or Prometheux fallback → `filter_method: "demo"`.

## Prometheux track — demo talking points

1. **Anti-hallucination gate** — Gemini never sees raw Tavily results; only Prometheux `matches` rows.
2. **Explainable constraints** — Rules are explicit logic, not prompt engineering.
3. **`prometheux_chain` SDK** — `px.config.set("PMTX_TOKEN", …)`, `save_concept`, `run_concept` on concept `matches`.
4. **Observable filter stats** — API returns `filter_stats: { candidates_in, candidates_out, filter_method }`.
5. **`cited.md` audit trail** — Shows which candidates passed Prometheux rules before itinerary formatting.

## Hackathon partners

| Partner | Role in Sidequest |
|---------|-------------------|
| **Tavily** | Live web search; enriches Luma/Eventbrite index with Instagram, social, Google |
| **Prometheux** | Deterministic logic filter (`prometheux_chain` SDK) |
| **Gemini** | Itinerary formatting from verified rows only |
| **Langfuse · ClickHouse** | Agent/tool/generation observability |
| **Firebase** | Auth, Firestore profiles, App Hosting deploy |
| **Luma API** | Curated community events (event source) |
| **Eventbrite** | Ticketed listings via scraping (event source) |

## Stack

| Layer | Technology |
| --- | --- |
| UI | Next.js, TypeScript, Tailwind CSS, Leaflet + OpenStreetMap |
| Event sources | Luma API, Eventbrite scraping |
| Live search | Tavily AI |
| **Deterministic filter** | **Prometheux** (`prometheux_chain`) |
| Itinerary formatting | Gemini (`gemini-3.1-pro-preview`) |
| Observability | Langfuse |
| Agentic payments | MPP — **scaffolded only, optional** (`SKIP_MPP=true` default) |
| Backend | Python FastAPI |

## Sidequest UI

The app opens to **Sidequest** — a map-first experience for discovering local events and planning verified itineraries.

| Flow | What happens |
|------|----------------|
| **Sign in** | Google via Firebase (`frontend/lib/auth.ts`). App name **Sidequest** in the Google account picker. Sign-in uses default Firebase scopes only (no `calendar.readonly`). Calendar free slots fall back to **mock slots** when no Google Calendar token is available (`frontend/lib/calendar.ts`). On the **`demo` branch**, onboarding also offers a **pseudo calendar connect** step (UI-only). Mock auth + localStorage when Firebase env vars are unset. See `Design.md` → Google Sign-In branding. |
| **Onboarding** | One-time profile modal (`ProfileOnboarding`) — home city, budget, diet, activities, accessibility. Saved to Firestore `users/{uid}` (or localStorage in mock mode). |
| **Calendar** | `frontend/lib/calendar.ts` derives morning / afternoon / evening free slots from Google Calendar when a token exists; otherwise mock slots. |
| **Discover** | `SidequestExplorer` → `GET /api/discover` → FastAPI `/discover` with profile constraints + `calendar_slots` JSON. Tavily search + Prometheux filter; cards show `passed_rules` badges (Budget, Location, Diet, Free saturday afternoon, …). |
| **Plan** | Select an event → **Plan weekend** → `POST /api/plan` (MPP skipped when `SKIP_MPP=true`) with profile + `calendar_slots`. Returns itinerary + `filter_stats`. |
| **Live Demo** | **`demo` branch only** — guided autoplay via `NEXT_PUBLIC_ENABLE_DEMO=true` and the Live Demo button. |

Key files: `frontend/components/SidequestExplorer.tsx`, `EventCard.tsx`, `ExplorerMap.tsx`, `frontend/lib/discover-client.ts`, `frontend/lib/calendar.ts`, `backend/discover.py`.

Type-check: `cd frontend && npx tsc --noEmit`

## Project structure

```
frontend/     # Sidequest UI + /api/discover + /api/plan proxy (MPP optional)
backend/      # discover.py + agent.py: Tavily → Prometheux → Gemini → cited.md
cited.md      # Generated output at repo root
Design.md     # Full PDD + architecture
```

## Environment variables

### Where to put them

| Location | Variables |
|----------|-----------|
| **Root `.env.local`** | Backend / agent: `USE_DEMO_DATA`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `PMTX_TOKEN`, `JARVISPY_URL`, `PMTX_PROJECT_ID`, `LANGFUSE_*`, `BACKEND_URL`, `SKIP_MPP`, `MPP_*` |
| **`frontend/.env.local`** | Browser / Next.js: `NEXT_PUBLIC_*`, `NEXT_PUBLIC_ENABLE_DEMO`, `NEXT_PUBLIC_USE_DEMO_DATA`, `NEXT_PUBLIC_FIREBASE_*`, `BACKEND_URL`, `SKIP_MPP` |

### Demo flags

| Variable | File | Purpose |
|----------|------|---------|
| `USE_DEMO_DATA` | root `.env.local` | Backend serves seeded events/plans; bypasses live Tavily/Gemini/Prometheux |
| `NEXT_PUBLIC_ENABLE_DEMO` | `frontend/.env.local` | Show **Live Demo** button and DemoRunner (`true` on `demo`, `false` on `main`) |
| `NEXT_PUBLIC_USE_DEMO_DATA` | `frontend/.env.local` | Mirror backend demo mode for shorter discover loading copy |

### Required keys (live path)

| Variable | Required | Notes |
|----------|----------|-------|
| `USE_DEMO_DATA` | no | Set `true` for seeded demo events/plans |
| `GEMINI_API_KEY` | yes* | Itinerary formatting (*not required when `USE_DEMO_DATA=true`) |
| `TAVILY_API_KEY` | yes* | Live search (*not required when `USE_DEMO_DATA=true`) |
| `PMTX_TOKEN` | yes* | Prometheux SDK — logic filter gate (*not required when `USE_DEMO_DATA=true`) |
| `JARVISPY_URL` | maybe | `https://api.prometheux.ai/jarvispy/{org}/{username}` |
| `PMTX_PROJECT_ID` | no | Defaults to `weekend-planner` |
| `LANGFUSE_*` | optional | Tracing |
| `MPP_*` | optional | Set `SKIP_MPP=false` to enable payment gate |

## Prometheux setup (live path)

When `USE_DEMO_DATA` is unset or `false`, the deterministic filter uses the Prometheux SDK and a valid API token.

1. **Sign up** at [platform.prometheux.ai](https://platform.prometheux.ai).
2. **Copy your API token** into `PMTX_TOKEN` in root `.env.local`.
3. **Set `JARVISPY_URL`** if the SDK docs require it:  
   `https://api.prometheux.ai/jarvispy/{org}/{username}`
4. **Leave `PMTX_PROJECT_ID=weekend-planner`** — default namespace; no manual project creation.

Restart the backend after updating env vars. If Prometheux is unavailable (`ENGINE_BUSY`, missing token), the backend falls back to seeded demo data with `filter_method: "demo"`.

## Verify locally

- `curl http://localhost:8000/health` → `{ "ok": true }`
- Discover with constraints:  
  `curl "http://localhost:8000/discover?location=Austin,%20TX&budget=150&diet=vegan&activities=music&calendar_slots=%5B%7B%22date%22%3A%22saturday%22%2C%22period%22%3A%22afternoon%22%7D%5D"`
- `cited.md` at repo root after planning lists verified candidates + itinerary
- Langfuse trace: `search-weekend-options` → `filter-with-prometheux` → `build-itinerary`

## Deploy

**Hackathon demo:** deploy from the **`demo`** branch. Frontend → **Firebase App Hosting**; backend → **Cloud Run** with `USE_DEMO_DATA=true`.

**Live URL:** `https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app` (see `firebase.json` redirect target).

One-liner:

```bash
# Backend → Cloud Run (set USE_DEMO_DATA=true for hackathon reliability)
cd backend && gcloud run deploy weekend-api --source . --region us-central1 --allow-unauthenticated --set-env-vars "USE_DEMO_DATA=true,..."

# Frontend → App Hosting (from repo root, demo branch)
cd frontend && npm run build && cd .. && npx -y firebase-tools@latest deploy --only apphosting
```

Set `BACKEND_URL` in `frontend/apphosting.yaml` to the Cloud Run service URL. Full steps: see **Deploy (Firebase App Hosting + Cloud Run)** below.

### Prerequisites (one-time, Firebase console)

1. **Blaze plan** — App Hosting requires billing: [upgrade project](https://console.firebase.google.com/project/perfect-weekend-planner/overview?purchaseBillingPlan=metered).
2. **Enable App Hosting** — Firebase console → **Build** → **App Hosting** → create backend `weekend-explorer` (or let the first CLI deploy create it).
3. **Authorized domains** — `localhost`, `perfect-weekend-planner.firebaseapp.com`, `perfect-weekend-planner.web.app`, and `weekend-explorer--perfect-weekend-planner.us-central1.hosted.app` are configured in `firebase.json`. See `Design.md` for API verify/update one-liners.
4. **Firestore** — rules/indexes deploy with `firebase deploy --only firestore` if not already applied.

### Configure environment

Edit `frontend/apphosting.yaml` before deploy:

| Variable | Where | Notes |
|----------|-------|-------|
| `BACKEND_URL` | `apphosting.yaml` or secret | Cloud Run URL for FastAPI |
| `NEXT_PUBLIC_FIREBASE_*` | App Hosting env / secrets | Web app config from Project Settings |
| `NEXT_PUBLIC_ENABLE_DEMO` | `apphosting.yaml` | `true` on demo branch for Live Demo |
| `SKIP_MPP` | `apphosting.yaml` | Keep `true` for hackathon demo |

For sensitive keys, use Secret Manager:

```bash
npx -y firebase-tools@latest apphosting:secrets:set BACKEND_URL
npx -y firebase-tools@latest apphosting:secrets:grantaccess BACKEND_URL --backend weekend-explorer
```

### Deploy frontend (App Hosting)

From the **repo root** (not `frontend/`):

```bash
cd frontend && npm install && npm run build
cd .. && npx -y firebase-tools@latest deploy --only apphosting
```

`firebase.json` sets `apphosting.rootDir` to `frontend` and `backendId` to `weekend-explorer`. Config file: `frontend/apphosting.yaml`.

### Deploy backend (Cloud Run, separate)

The Python FastAPI backend is **not** bundled into App Hosting:

```bash
cd backend
gcloud run deploy weekend-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "USE_DEMO_DATA=true,GEMINI_API_KEY=...,TAVILY_API_KEY=...,PMTX_TOKEN=..."
```

Set `BACKEND_URL` in `frontend/apphosting.yaml` to the Cloud Run service URL, then redeploy the frontend.

### Local map

The explorer map uses **Leaflet + OpenStreetMap** — no Google Maps API key required.

## License

Private hackathon submission.
