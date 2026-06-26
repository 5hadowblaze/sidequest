# Perfect Weekend Planner Agent

Multiagents Hackathon (June 2026) — a deterministic autonomous agent for real-world orchestration.

The agent ingests user constraints (budget, location, dietary/accessibility requirements), queries live web data, filters results deterministically, optionally settles via agentic payment rails, and publishes a verified itinerary to `cited.md`.

## Stack

| Layer | Technology |
| --- | --- |
| UI & orchestration | Next.js, TypeScript, Tailwind CSS |
| Live search | Tavily AI |
| Deterministic filtering | Prometheux / Vadalog |
| Observability | Langfuse |
| Agentic payments | Machine Payments Protocol (MPP) |
| Agent backend | Python (FastAPI) |

## Project structure (planned)

```
frontend/     # Next.js appCode UI + MPP-gated API routes
backend/      # Python agent (Tavily → Prometheux → Langfuse → cited.md)
```

## Getting started

Setup instructions will be added as the scaffold lands. Copy `.env.example` to `.env.local` (frontend) and `.env` (backend) when integrating external services.

## License

Private hackathon submission.
