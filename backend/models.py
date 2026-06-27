from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

CalendarPeriod = Literal["morning", "afternoon", "evening"]


class CalendarSlot(BaseModel):
    date: str = Field(..., min_length=1, description="Day token e.g. saturday or 2026-06-28")
    period: CalendarPeriod


class UserConstraintContext(BaseModel):
    budget: float = Field(..., gt=0)
    diet: str = Field(default="")
    activities: str = Field(default="")
    accessibility: Optional[str] = None
    home_location: str = Field(..., min_length=1)
    calendar_slots: list[CalendarSlot] = Field(default_factory=list)


class PlanRequest(BaseModel):
    location: str = Field(..., min_length=1)
    budget: float = Field(..., gt=0)
    diet: str = Field(..., min_length=1)
    activities: str = Field(..., min_length=1)
    accessibility: Optional[str] = None
    calendar_slots: list[CalendarSlot] = Field(default_factory=list)


class CandidateItem(BaseModel):
    id: str
    type: Literal["event", "restaurant"]
    title: str
    url: str
    snippet: str
    price_estimate: float
    location: str
    tags: str
    date_hint: str = ""


class ItineraryItem(BaseModel):
    time: str
    activity: str
    venue: str
    cost: str
    diet_access: str
    source_url: str
    source_index: int = Field(..., ge=1)


class FilterStats(BaseModel):
    candidates_in: int
    candidates_out: int
    filter_method: Literal["sdk", "demo"]
    concept_name: str = "weekend_planner_matches"


class PlanResult(BaseModel):
    itinerary: list[ItineraryItem]
    cited_path: str
    trace_id: Optional[str] = None
    filter_stats: FilterStats


class DiscoverEvent(BaseModel):
    id: str
    title: str
    description: str
    category: str
    image_url: str
    price_estimate: Optional[float] = None
    price_label: str = "See details"
    location: str
    lat: float
    lng: float
    url: str
    date_hint: Optional[str] = None
    passed_rules: list[str] = Field(default_factory=list)
    prometheux_verified: bool = False
    filter_method: Optional[Literal["sdk", "demo"]] = None
    match_score: Optional[int] = None


class DiscoverResponse(BaseModel):
    location: str
    events: list[DiscoverEvent]
    source: Literal["tavily", "mock", "demo"] = "tavily"
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    filter_stats: Optional[FilterStats] = None
