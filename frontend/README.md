# Frontend

Sidequest Next.js app. Full setup, stack, and deploy notes live in the [root README](../README.md).

## Environment

Copy `frontend/.env.local.example` → `frontend/.env.local`. All `NEXT_PUBLIC_*` vars belong here (not the repo root).

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_ENABLE_DEMO` | `true` on `demo` branch (Live Demo button); `false` on `main` |
| `NEXT_PUBLIC_USE_DEMO_DATA` | Mirror backend `USE_DEMO_DATA` for shorter discover loading copy |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (optional — mock auth if unset) |
| `BACKEND_URL` | FastAPI proxy target (default `http://localhost:8000`) |

Backend keys (`USE_DEMO_DATA`, `PMTX_TOKEN`, etc.) go in root `.env.local`.

## Commands

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also run before App Hosting deploy)
npx vitest run   # unit tests
npx tsc --noEmit # type-check
```
