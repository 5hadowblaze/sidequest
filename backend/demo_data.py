from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass
from typing import Any

from models import (
    CandidateItem,
    DiscoverEvent,
    DiscoverResponse,
    FilterStats,
    ItineraryItem,
    PlanRequest,
    PlanResult,
    UserConstraintContext,
)
from event_images import image_for_event
from prometheux_filter import compute_passed_rules

logger = logging.getLogger(__name__)

CITY_COORDS: dict[str, tuple[float, float]] = {
    "austin": (30.2672, -97.7431),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.006),
    "nyc": (40.7128, -74.006),
    "los angeles": (34.0522, -118.2437),
    "chicago": (41.8781, -87.6298),
    "seattle": (47.6062, -122.3321),
    "boston": (42.3601, -71.0589),
    "denver": (39.7392, -104.9903),
    "miami": (25.7617, -80.1918),
    "portland": (45.5152, -122.6784),
    "london": (51.5074, -0.1278),
    "paris": (48.8566, 2.3522),
    "tokyo": (35.6762, 139.6503),
}

DEMO_FILTER_STATS = FilterStats(
    candidates_in=0,
    candidates_out=0,
    filter_method="demo",
    concept_name="demo_seed",
)


@dataclass(frozen=True)
class _EventSeed:
    title: str
    category: str
    description: str
    price: float
    price_label: str
    url: str
    date_hint: str
    tags: str


def is_demo_mode_forced() -> bool:
    return os.environ.get("USE_DEMO_DATA", "").lower() in ("1", "true", "yes")


def _city_center(location: str) -> tuple[float, float]:
    lowered = location.lower().strip()
    for city, coords in CITY_COORDS.items():
        if city in lowered:
            return coords
    digest = hashlib.sha256(location.encode()).hexdigest()
    lat_offset = (int(digest[:4], 16) / 65535 - 0.5) * 0.08
    lng_offset = (int(digest[4:8], 16) / 65535 - 0.5) * 0.08
    return (37.7749 + lat_offset, -122.4194 + lng_offset)


def _jitter_coords(base: tuple[float, float], seed: str) -> tuple[float, float]:
    digest = hashlib.sha256(seed.encode()).hexdigest()
    lat_j = (int(digest[:4], 16) / 65535 - 0.5) * 0.06
    lng_j = (int(digest[4:8], 16) / 65535 - 0.5) * 0.06
    return (base[0] + lat_j, base[1] + lng_j)


def _match_city_key(location: str) -> str | None:
    lowered = location.lower()
    for city in CITY_COORDS:
        if city in lowered:
            return city
    return None


def _catalog_for_location(location: str) -> list[_EventSeed]:
    city = _match_city_key(location)
    if city == "london":
        return _LONDON_EVENTS
    if city in ("new york", "nyc"):
        return _NYC_EVENTS
    if city == "austin":
        return _AUSTIN_EVENTS
    if city == "san francisco":
        return _SF_EVENTS
    if city == "chicago":
        return _CHICAGO_EVENTS
    if city == "seattle":
        return _SEATTLE_EVENTS
    return _GENERIC_EVENTS


_LONDON_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Borough Market Weekend Food Festival",
        "Festival",
        "Artisan food stalls, live cooking demos, and street music along the Thames — Saturday all day.",
        0.0,
        "Free",
        "https://boroughmarket.org.uk/events/weekend-festival",
        "Saturday 10:00–18:00",
        "food,festival,market",
    ),
    _EventSeed(
        "Shoreditch Vinyl Pop-up Market",
        "Popup",
        "Independent record sellers and DJ sets in a converted warehouse — this weekend only.",
        12.0,
        "From £12",
        "https://www.eventbrite.co.uk/e/shoreditch-vinyl-popup",
        "Saturday afternoon",
        "popup,music,art",
    ),
    _EventSeed(
        "Southbank Riverside Pub Hangout",
        "Pub hangout",
        "Craft beer tasting flight and acoustic sets at riverside pubs — budget-friendly.",
        18.0,
        "From £18",
        "https://www.timeout.com/london/things-to-do/southbank-pub-crawl",
        "Saturday evening",
        "pub,food,drink",
    ),
    _EventSeed(
        "Tech Founders Meetup: AI & Startups",
        "Meetup",
        "Lightning talks from London founders plus networking — vegetarian snacks included.",
        0.0,
        "Free",
        "https://www.meetup.com/london-tech-startups/events/weekend-ai",
        "Sunday 11:00",
        "tech,meetup,networking",
    ),
    _EventSeed(
        "Tate Modern Late: Contemporary Art Night",
        "Art",
        "After-hours gallery access, installations, and DJ sets — wheelchair accessible.",
        22.0,
        "£22",
        "https://www.tate.org.uk/visit/tate-modern/late",
        "Friday night",
        "art,culture,evening",
    ),
    _EventSeed(
        "Camden Street Food & Live Music",
        "Festival",
        "Global street food vendors and indie bands in Camden Market — outdoor, family-friendly.",
        15.0,
        "From £15",
        "https://www.camdenmarket.com/events/weekend-food-music",
        "Saturday & Sunday",
        "food,music,festival",
    ),
    _EventSeed(
        "Dishoom Sunday Brunch Reservation",
        "Food & drink",
        "Iconic Bombay-style brunch with vegan and vegetarian plates under budget.",
        28.0,
        "£28",
        "https://www.dishoom.com/london/reservations",
        "Sunday morning",
        "food,restaurant,brunch",
    ),
    _EventSeed(
        "Hyde Park Outdoor Film Screening",
        "Concert",
        "Classic films on the lawn with picnic-friendly setup — Saturday night under the stars.",
        14.0,
        "£14",
        "https://www.royalparks.org.uk/parks/hyde-park/events/film-night",
        "Saturday evening",
        "outdoor,film,evening",
    ),
    _EventSeed(
        "King's Cross Makers Market",
        "Market",
        "Ceramics, prints, and small-batch goods from local makers — free entry.",
        0.0,
        "Free",
        "https://www.kingscross.co.uk/events/makers-market",
        "Sunday 10:00–16:00",
        "market,art,shopping",
    ),
    _EventSeed(
        "Greenwich Day Trip: Thames Clipper & Observatory",
        "Travel",
        "River shuttle plus guided walk to the Royal Observatory — half-day adventure.",
        35.0,
        "From £35",
        "https://www.rmg.co.uk/royal-observatory/visit/day-trip",
        "Saturday morning",
        "travel,outdoor,sightseeing",
    ),
]

_NYC_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Smorgasburg Williamsburg Food Festival",
        "Festival",
        "Brooklyn's largest open-air food market — hundreds of vendors this Saturday.",
        0.0,
        "Free entry",
        "https://www.smorgasburg.com/",
        "Saturday 11:00–18:00",
        "food,festival,outdoor",
    ),
    _EventSeed(
        "Chelsea Gallery Hop: New Voices Opening",
        "Art",
        "Opening receptions across Chelsea galleries with emerging artists — free wine.",
        0.0,
        "Free",
        "https://www.chelseagalleryopenings.com/weekend",
        "Thursday–Saturday evening",
        "art,gallery,culture",
    ),
    _EventSeed(
        "Brooklyn Indie Dev Conference",
        "Conference",
        "Talks on shipping fast, hallway track, and demo day — Saturday pass.",
        45.0,
        "$45",
        "https://www.eventbrite.com/e/brooklyn-indie-dev-conf",
        "Saturday 09:00–17:00",
        "tech,conference,meetup",
    ),
    _EventSeed(
        "East Village Vegan Food Tour",
        "Food & drink",
        "Guided tasting of plant-based spots — vegetarian and vegan options throughout.",
        38.0,
        "$38",
        "https://www.viator.com/tours/New-York/east-village-vegan-food",
        "Saturday afternoon",
        "food,vegan,tour",
    ),
    _EventSeed(
        "Jazz at Lincoln Center Late Set",
        "Concert",
        "World-class jazz in an accessible venue — Saturday late show.",
        55.0,
        "From $55",
        "https://www.jazz.org/events/late-set",
        "Saturday 20:00",
        "music,jazz,concert",
    ),
    _EventSeed(
        "High Line Sunset Pop-up Bar",
        "Popup",
        "Rooftop-style drinks and DJs along the elevated park — this weekend only.",
        20.0,
        "From $20",
        "https://www.thehighline.org/activities/popup-bar",
        "Friday–Sunday evening",
        "popup,drink,outdoor",
    ),
    _EventSeed(
        "Central Park Running Club Meetup",
        "Meetup",
        "Easy-paced group run and coffee afterwards — all levels welcome.",
        0.0,
        "Free",
        "https://www.meetup.com/nyc-running-club/events/central-park",
        "Sunday morning",
        "sport,meetup,outdoor",
    ),
    _EventSeed(
        "MoMA Friday Night Uniqlo Sponsored Entry",
        "Art",
        "Pay-what-you-wish Friday evenings with special exhibitions.",
        0.0,
        "Free",
        "https://www.moma.org/calendar/friday-night",
        "Friday evening",
        "art,museum,culture",
    ),
    _EventSeed(
        "Queens Night Market",
        "Market",
        "Global street food and live performances in Flushing Meadows — Saturday night.",
        5.0,
        "From $5",
        "https://www.queensnightmarket.com/",
        "Saturday 18:00–00:00",
        "food,market,festival",
    ),
    _EventSeed(
        "Staten Island Ferry & Pizza Day Trip",
        "Travel",
        "Free ferry ride plus famous slice crawl — budget-friendly adventure.",
        12.0,
        "From $12",
        "https://www.nycgo.com/events/staten-island-day-trip",
        "Sunday afternoon",
        "travel,food,sightseeing",
    ),
]

_AUSTIN_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "SXSW Side Stage: Local Bands Showcase",
        "Concert",
        "Unsigned Austin acts on outdoor stages — free with RSVP this Saturday.",
        0.0,
        "Free",
        "https://www.austinchronicle.com/events/sxsw-side-stage",
        "Saturday afternoon",
        "music,concert,outdoor",
    ),
    _EventSeed(
        "Rainey Street Food Truck Rally",
        "Festival",
        "Food trucks, live music, and patio hangouts along Rainey — weekend staple.",
        15.0,
        "From $15",
        "https://www.austintexas.org/events/rainey-food-trucks",
        "Saturday & Sunday",
        "food,festival,outdoor",
    ),
    _EventSeed(
        "East Austin Makers Pop-up",
        "Popup",
        "Local makers selling ceramics, prints, and vintage — indoor/outdoor market.",
        0.0,
        "Free",
        "https://www.eventbrite.com/e/east-austin-makers-popup",
        "Sunday 11:00–17:00",
        "popup,market,art",
    ),
    _EventSeed(
        "Barton Springs Pool Morning Swim Meetup",
        "Meetup",
        "Group swim and coffee at Zilker — outdoor, wheelchair-accessible paths nearby.",
        5.0,
        "$5 entry",
        "https://www.meetup.com/austin-outdoor-adventures/events/barton-springs",
        "Sunday morning",
        "outdoor,meetup,sport",
    ),
    _EventSeed(
        "6th Street Pub Crawl: Live Music Route",
        "Pub hangout",
        "Guided route through legendary Austin venues with cover-band sets.",
        25.0,
        "$25",
        "https://www.austintexas.org/events/6th-street-crawl",
        "Saturday evening",
        "pub,music,nightlife",
    ),
    _EventSeed(
        "Vegan BBQ Pop-up at Mueller Farmers Market",
        "Food & drink",
        "Plant-based BBQ plates and local produce — Saturday morning market.",
        18.0,
        "From $18",
        "https://www.farmersmarketonline.com/austin/mueller-vegan-bbq",
        "Saturday morning",
        "food,vegan,market",
    ),
    _EventSeed(
        "Austin Tech Brunch: Startup Networking",
        "Meetup",
        "Casual brunch for founders and engineers — vegetarian options available.",
        0.0,
        "Free",
        "https://www.meetup.com/austin-startup-founder/events/tech-brunch",
        "Sunday 10:00",
        "tech,meetup,networking",
    ),
    _EventSeed(
        "Blanton Museum First Sundays",
        "Art",
        "Free admission and family art activities — wheelchair accessible.",
        0.0,
        "Free",
        "https://blantonmuseum.org/visit/first-sundays",
        "Sunday 13:00–17:00",
        "art,museum,culture",
    ),
    _EventSeed(
        "Hill Country Day Trip Shuttle",
        "Travel",
        "Organized shuttle to wineries and swimming holes — Saturday departure.",
        65.0,
        "From $65",
        "https://www.viator.com/tours/Austin/hill-country-day-trip",
        "Saturday 08:00",
        "travel,outdoor,wine",
    ),
    _EventSeed(
        "Domain Northside Outdoor Movie Night",
        "Concert",
        "Family-friendly films on the lawn with food trucks — free admission.",
        0.0,
        "Free",
        "https://www.domainnorthside.com/events/movie-night",
        "Saturday evening",
        "outdoor,film,family",
    ),
]

_SF_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Ferry Building Farmers Market",
        "Market",
        "Bay Area produce, artisan cheese, and coffee — Saturday morning institution.",
        0.0,
        "Free",
        "https://www.ferrybuildingmarketplace.com/farmers-market",
        "Saturday 08:00–14:00",
        "food,market,outdoor",
    ),
    _EventSeed(
        "Mission District Taco & Art Walk",
        "Festival",
        "Murals, galleries, and taquerias on a self-guided route — budget-friendly.",
        20.0,
        "From $20",
        "https://www.sftravel.com/events/mission-art-walk",
        "Saturday afternoon",
        "art,food,outdoor",
    ),
    _EventSeed(
        "SoMa Tech Meetup: AI Builders Night",
        "Meetup",
        "Demos from local AI startups plus pizza — free RSVP.",
        0.0,
        "Free",
        "https://www.meetup.com/sf-machine-learning/events/ai-builders",
        "Wednesday evening",
        "tech,meetup,ai",
    ),
    _EventSeed(
        "Golden Gate Park Sunday Picnic Concert",
        "Concert",
        "Free outdoor concert at the bandshell — bring a blanket.",
        0.0,
        "Free",
        "https://sfrecpark.org/golden-gate-park-concerts",
        "Sunday afternoon",
        "music,outdoor,concert",
    ),
    _EventSeed(
        "Chinatown Night Market Pop-up",
        "Popup",
        "Lantern-lit stalls, dim sum, and lion dance performances — weekend special.",
        12.0,
        "From $12",
        "https://www.eventbrite.com/e/chinatown-night-market-sf",
        "Friday–Sunday evening",
        "food,popup,culture",
    ),
    _EventSeed(
        "Castro Pub Pride Weekend Hangout",
        "Pub hangout",
        "Rainbow-decorated bars with drag brunch and patio seating.",
        22.0,
        "From $22",
        "https://www.sftravel.com/events/castro-pub-crawl",
        "Saturday afternoon",
        "pub,food,nightlife",
    ),
    _EventSeed(
        "SFMOMA Free First Thursday",
        "Art",
        "Free admission evening with special exhibits — accessible entrances.",
        0.0,
        "Free",
        "https://www.sfmoma.org/visit/free-days",
        "Thursday evening",
        "art,museum,culture",
    ),
    _EventSeed(
        "Sausalito Ferry Day Trip",
        "Travel",
        "Scenic ferry ride and waterfront lunch — half-day escape from the city.",
        28.0,
        "From $28",
        "https://www.blueandgoldfleet.com/sausalito-ferry",
        "Saturday morning",
        "travel,outdoor,sightseeing",
    ),
]

_CHICAGO_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Millennium Park Summer Music Series",
        "Concert",
        "Free outdoor concerts at Jay Pritzker Pavilion — this Saturday evening.",
        0.0,
        "Free",
        "https://www.chicago.gov/city/en/depts/dca/supp_info/millennium_park.html",
        "Saturday 18:30",
        "music,concert,outdoor",
    ),
    _EventSeed(
        "Wicker Park Art & Vintage Pop-up",
        "Popup",
        "Vintage clothing, prints, and live DJs in a warehouse space.",
        8.0,
        "From $8",
        "https://www.eventbrite.com/e/wicker-park-vintage-popup",
        "Sunday 12:00–18:00",
        "popup,art,shopping",
    ),
    _EventSeed(
        "River North Food Hall Weekend Tasting",
        "Food & drink",
        "Sample plates from a dozen vendors — vegetarian options marked.",
        25.0,
        "From $25",
        "https://www.timeout.com/chicago/restaurants/food-hall-tasting",
        "Saturday afternoon",
        "food,festival,indoor",
    ),
    _EventSeed(
        "Lakefront Trail Group Bike Meetup",
        "Meetup",
        "Casual lakefront ride ending at a lakeside cafe — all skill levels.",
        0.0,
        "Free",
        "https://www.meetup.com/chicago-cycling/events/lakefront-ride",
        "Sunday morning",
        "sport,meetup,outdoor",
    ),
    _EventSeed(
        "Green Mill Jazz Club Late Set",
        "Pub hangout",
        "Historic speakeasy vibes with live jazz until 2am — cover charge.",
        15.0,
        "$15 cover",
        "https://www.greenmilljazz.com/events",
        "Saturday night",
        "music,jazz,pub",
    ),
    _EventSeed(
        "Navy Pier Fireworks & Festival",
        "Festival",
        "Fireworks show with food vendors and carnival games — family night.",
        0.0,
        "Free",
        "https://navypier.org/events/fireworks",
        "Saturday 21:00",
        "festival,family,outdoor",
    ),
    _EventSeed(
        "Architecture River Cruise Day Trip",
        "Travel",
        "Guided boat tour of Chicago's skyline — wheelchair-accessible boarding.",
        48.0,
        "From $48",
        "https://www.chicagoline.com/architecture-tour",
        "Saturday 14:00",
        "travel,sightseeing,outdoor",
    ),
]

_SEATTLE_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Pike Place Market Chef Demo Weekend",
        "Market",
        "Local chefs demo seasonal recipes with tastings — Saturday morning.",
        0.0,
        "Free",
        "https://www.pikeplacemarket.org/events/chef-demo",
        "Saturday 10:00",
        "food,market,cooking",
    ),
    _EventSeed(
        "Capitol Hill Record Store Day Pop-up",
        "Popup",
        "Exclusive vinyl releases and in-store performances — limited weekend.",
        0.0,
        "Free entry",
        "https://www.eventbrite.com/e/capitol-hill-record-popup",
        "Saturday all day",
        "popup,music,shopping",
    ),
    _EventSeed(
        "Fremont Sunday Brewery Tour",
        "Pub hangout",
        "Craft beer flight at three Fremont breweries — walking distance route.",
        30.0,
        "From $30",
        "https://www.seattlebrewerytour.com/fremont",
        "Sunday afternoon",
        "pub,drink,food",
    ),
    _EventSeed(
        "Discovery Park Coastal Hike Meetup",
        "Meetup",
        "Guided coastal trail with birdwatching — outdoor, moderate difficulty.",
        0.0,
        "Free",
        "https://www.meetup.com/seattle-hikers/events/discovery-park",
        "Sunday morning",
        "outdoor,meetup,hiking",
    ),
    _EventSeed(
        "Chihuly Garden Glass Night Lights",
        "Art",
        "Illuminated glass sculptures after dark — accessible pathways.",
        32.0,
        "$32",
        "https://www.chihulygardenandglass.com/visit/night-lights",
        "Friday–Saturday evening",
        "art,culture,evening",
    ),
    _EventSeed(
        "Ballard Seafood & Music Festival",
        "Festival",
        "Fresh seafood, local bands, and craft vendors — outdoor weekend event.",
        18.0,
        "From $18",
        "https://www.ballardseafest.com/",
        "Saturday & Sunday",
        "food,music,festival",
    ),
    _EventSeed(
        "Bainbridge Island Ferry Day Trip",
        "Travel",
        "Scenic ferry crossing plus waterfront lunch — easy half-day escape.",
        22.0,
        "From $22",
        "https://www.wsdot.com/ferries/bainbridge-day-trip",
        "Saturday morning",
        "travel,outdoor,sightseeing",
    ),
]

_GENERIC_EVENTS: list[_EventSeed] = [
    _EventSeed(
        "Downtown Weekend Street Festival",
        "Festival",
        "Food trucks, artisan stalls, and live music closing the main street.",
        0.0,
        "Free",
        "https://www.eventbrite.com/e/downtown-weekend-festival",
        "Saturday & Sunday",
        "festival,food,music",
    ),
    _EventSeed(
        "Rooftop Sunset Pop-up Bar",
        "Popup",
        "Limited-run rooftop drinks with DJ sets — reservations recommended.",
        20.0,
        "From $20",
        "https://www.timeout.com/events/rooftop-popup",
        "Friday–Sunday evening",
        "popup,drink,nightlife",
    ),
    _EventSeed(
        "Indie Makers Market",
        "Market",
        "Local artisans selling ceramics, prints, and small-batch goods.",
        0.0,
        "Free",
        "https://www.meetup.com/local-makers/events/weekend-market",
        "Sunday 10:00–16:00",
        "market,art,shopping",
    ),
    _EventSeed(
        "Neighborhood Pub Crawl",
        "Pub hangout",
        "Guided tasting route through three beloved local pubs with live music.",
        25.0,
        "$25",
        "https://www.viator.com/tours/pub-crawl",
        "Saturday evening",
        "pub,music,food",
    ),
    _EventSeed(
        "Tech & Coffee Morning Meetup",
        "Meetup",
        "Casual networking for builders — free coffee and vegetarian pastries.",
        0.0,
        "Free",
        "https://www.meetup.com/tech-coffee/events/weekend",
        "Saturday 09:00",
        "tech,meetup,networking",
    ),
    _EventSeed(
        "Gallery Opening: New Voices",
        "Art",
        "Opening reception with emerging local artists and small bites.",
        0.0,
        "Free",
        "https://www.artsy.net/events/gallery-opening",
        "Friday evening",
        "art,culture,gallery",
    ),
    _EventSeed(
        "Farm-to-Table Brunch Spot",
        "Food & drink",
        "Seasonal brunch with vegan and vegetarian plates — weekend reservations.",
        28.0,
        "From $28",
        "https://www.opentable.com/farm-to-table-brunch",
        "Sunday morning",
        "food,restaurant,brunch",
    ),
    _EventSeed(
        "Outdoor Film Night in the Park",
        "Concert",
        "Classic movies under the stars — bring blankets and snacks.",
        12.0,
        "$12",
        "https://www.filmsinthepark.org/weekend",
        "Saturday evening",
        "outdoor,film,evening",
    ),
    _EventSeed(
        "Coastal Day Trip Shuttle",
        "Travel",
        "Organized shuttle and guided trail experience — half-day adventure.",
        45.0,
        "From $45",
        "https://www.viator.com/tours/coastal-day-trip",
        "Saturday morning",
        "travel,outdoor,sightseeing",
    ),
    _EventSeed(
        "Community Yoga in the Park",
        "Sports",
        "All-levels outdoor yoga followed by farmers market visit.",
        10.0,
        "$10",
        "https://www.eventbrite.com/e/park-yoga-weekend",
        "Sunday morning",
        "sport,outdoor,wellness",
    ),
]


def _seeds_to_events(
    location: str,
    seeds: list[_EventSeed],
    context: UserConstraintContext | None,
) -> list[DiscoverEvent]:
    base = _city_center(location)
    events: list[DiscoverEvent] = []
    city_slug = re.sub(r"[^a-z0-9]+", "_", (_match_city_key(location) or "generic"))[:20]

    for idx, seed in enumerate(seeds, start=1):
        event_id = f"demo_{city_slug}_{idx}"
        lat, lng = _jitter_coords(base, event_id)
        event = DiscoverEvent(
            id=event_id,
            title=seed.title,
            description=seed.description,
            category=seed.category,
            image_url=image_for_event(seed.title, seed.category),
            price_estimate=seed.price,
            price_label=seed.price_label,
            location=location,
            lat=lat,
            lng=lng,
            url=seed.url,
            date_hint=seed.date_hint,
            filter_method="demo",
        )
        if context is not None:
            candidate = CandidateItem(
                id=event.id,
                type="event",
                title=event.title,
                url=event.url,
                snippet=f"{event.description} {seed.tags}",
                price_estimate=float(event.price_estimate or 0.0),
                location=event.location,
                tags=seed.tags,
                date_hint=event.date_hint or "",
            )
            rules = compute_passed_rules(candidate, context)
            event = event.model_copy(
                update={
                    "passed_rules": rules,
                    "match_score": len(rules),
                    "prometheux_verified": False,
                }
            )
        events.append(event)
    return events


def get_demo_discover_events(
    location: str,
    context: UserConstraintContext | None = None,
) -> list[DiscoverEvent]:
    seeds = _catalog_for_location(location)
    return _seeds_to_events(location, seeds, context)


def build_demo_discover_response(
    location: str,
    context: UserConstraintContext | None = None,
) -> DiscoverResponse:
    events = get_demo_discover_events(location, context)
    center = _city_center(location)
    candidates_in = len(events)
    candidates_out = candidates_in
    if context is not None:
        candidates_out = sum(1 for event in events if event.passed_rules)

    filter_stats = FilterStats(
        candidates_in=candidates_in,
        candidates_out=candidates_out,
        filter_method="demo",
        concept_name="demo_seed",
    )
    logger.info(
        "Serving demo discover data for %s (%d events, %d passed rules)",
        location,
        len(events),
        candidates_out,
    )
    return DiscoverResponse(
        location=location,
        events=events,
        source="demo",
        center_lat=center[0],
        center_lng=center[1],
        filter_stats=filter_stats if context is not None else None,
    )


def get_demo_candidates(request: PlanRequest) -> list[CandidateItem]:
    context = UserConstraintContext(
        budget=request.budget,
        diet=request.diet,
        activities=request.activities,
        accessibility=request.accessibility,
        home_location=request.location,
        calendar_slots=request.calendar_slots,
    )
    events = get_demo_discover_events(request.location, context)
    candidates: list[CandidateItem] = []
    for event in events:
        candidates.append(
            CandidateItem(
                id=event.id,
                type="event",
                title=event.title,
                url=event.url,
                snippet=event.description,
                price_estimate=float(event.price_estimate or 0.0),
                location=event.location,
                tags=",".join(event.passed_rules) if event.passed_rules else event.category.lower(),
                date_hint=event.date_hint or "",
            )
        )

    restaurant_seeds = [
        _EventSeed(
            "Local Farm-to-Table Brunch",
            "Food & drink",
            f"Seasonal brunch with {request.diet} options near {request.location}.",
            min(request.budget * 0.25, 35.0),
            f"From ${min(request.budget * 0.25, 35.0):.0f}",
            "https://www.opentable.com/demo-brunch",
            "Sunday 10:00",
            f"food,restaurant,{request.diet}",
        ),
        _EventSeed(
            "Neighborhood Bistro Dinner",
            "Food & drink",
            f"Chef-driven plates with {request.diet} menu — Saturday evening reservation.",
            min(request.budget * 0.35, 55.0),
            f"From ${min(request.budget * 0.35, 55.0):.0f}",
            "https://www.opentable.com/demo-bistro",
            "Saturday 19:00",
            f"food,restaurant,{request.diet}",
        ),
    ]
    for idx, seed in enumerate(restaurant_seeds, start=1):
        candidate = CandidateItem(
            id=f"demo_rst_{idx}",
            type="restaurant",
            title=seed.title,
            url=seed.url,
            snippet=seed.description,
            price_estimate=seed.price,
            location=request.location,
            tags=seed.tags,
            date_hint=seed.date_hint,
        )
        candidates.append(candidate)
    return candidates


def _extract_focus_event_title(activities: str) -> str | None:
    match = re.search(r"Focus event:\s*([^(]+)", activities, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def build_demo_itinerary(
    candidates: list[CandidateItem],
    request: PlanRequest,
) -> list[ItineraryItem]:
    focus_title = _extract_focus_event_title(request.activities)
    ordered = list(candidates)
    if focus_title:
        focus_lower = focus_title.lower()
        ordered.sort(
            key=lambda item: (
                0 if focus_lower in item.title.lower() else 1,
                item.type != "event",
            )
        )

    slots = [
        "Saturday 10:00",
        "Saturday 14:00",
        "Saturday 19:00",
        "Sunday 11:00",
    ]
    items: list[ItineraryItem] = []
    for idx, candidate in enumerate(ordered[: len(slots)]):
        items.append(
            ItineraryItem(
                time=slots[idx],
                activity="Dining" if candidate.type == "restaurant" else "Activity",
                venue=candidate.title,
                cost=f"${candidate.price_estimate:.0f}"
                if candidate.price_estimate > 0
                else "Free",
                diet_access=request.diet
                if candidate.type == "restaurant"
                else (request.accessibility or "—"),
                source_url=candidate.url,
                source_index=idx + 1,
            )
        )
    return items


def build_demo_plan_result(request: PlanRequest) -> PlanResult:
    candidates = get_demo_candidates(request)
    filtered = candidates[:6]
    itinerary = build_demo_itinerary(filtered, request)
    filter_stats = FilterStats(
        candidates_in=len(candidates),
        candidates_out=len(filtered),
        filter_method="demo",
        concept_name="demo_seed",
    )
    from format_output import write_cited_md as persist_cited_md

    cited_path = str(persist_cited_md(itinerary, filtered, filter_stats))
    logger.info(
        "Serving demo plan for %s (%d itinerary slots)",
        request.location,
        len(itinerary),
    )
    return PlanResult(
        itinerary=itinerary,
        cited_path=cited_path,
        trace_id=None,
        filter_stats=filter_stats,
    )


def demo_event_count_for_location(location: str) -> int:
    return len(_catalog_for_location(location))
