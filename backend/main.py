from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from agent import run_weekend_planner
from discover import discover_local_events, parse_calendar_slots
from models import CalendarSlot, DiscoverResponse, PlanRequest, PlanResult, UserConstraintContext
from prometheux_filter import PrometheuxConfigError, PrometheuxEngineBusyError, PrometheuxSDKError

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="Sidequest", version="0.1.0")

_default_origins = [
    "http://localhost:3000",
    "https://perfect-weekend-planner.web.app",
    "https://perfect-weekend-planner.firebaseapp.com",
    "https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app",
]
_extra_origins = os.environ.get("CORS_ORIGINS", "")
_cors_origins = _default_origins + [o.strip() for o in _extra_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/discover", response_model=DiscoverResponse)
def discover(
    location: str,
    budget: Optional[float] = Query(default=None, gt=0),
    diet: Optional[str] = Query(default=None),
    activities: Optional[str] = Query(default=None),
    accessibility: Optional[str] = Query(default=None),
    calendar_slots: Optional[str] = Query(
        default=None,
        description='JSON array e.g. [{"date":"saturday","period":"afternoon"}]',
    ),
) -> DiscoverResponse:
    if not location.strip():
        raise HTTPException(status_code=400, detail="location query parameter is required")

    context: UserConstraintContext | None = None
    if budget is not None:
        if not os.environ.get("PMTX_TOKEN"):
            raise HTTPException(
                status_code=503,
                detail="PMTX_TOKEN is required for Prometheux discover filtering",
            )
        try:
            slots = [CalendarSlot.model_validate(item) for item in parse_calendar_slots(calendar_slots)]
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid calendar_slots: {exc}") from exc

        context = UserConstraintContext(
            budget=budget,
            diet=diet or "",
            activities=activities or "",
            accessibility=accessibility,
            home_location=location.strip(),
            calendar_slots=slots,
        )

    try:
        return discover_local_events(location.strip(), context=context)
    except PrometheuxConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PrometheuxEngineBusyError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    except PrometheuxSDKError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/plan", response_model=PlanResult)
def plan(request: PlanRequest) -> PlanResult:
    missing = [
        key
        for key in ("GEMINI_API_KEY", "TAVILY_API_KEY", "PMTX_TOKEN")
        if not os.environ.get(key)
    ]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Missing required environment variables: {', '.join(missing)}",
        )

    try:
        return run_weekend_planner(request)
    except PrometheuxConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PrometheuxSDKError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=503, detail=f"Missing configuration: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
