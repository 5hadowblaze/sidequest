import XCTest
@testable import Sidequest

final class ModelsTests: XCTestCase {
    func testDiscoverResponseDecoding() throws {
        let json = """
        {
          "location": "Austin, TX",
          "events": [
            {
              "id": "disc_1",
              "title": "Weekend Street Festival",
              "description": "Free outdoor festival this Saturday.",
              "category": "Festival",
              "image_url": "/images/events/festival-crowd.jpg",
              "price_estimate": 0.0,
              "price_label": "Free",
              "location": "Austin, TX",
              "lat": 30.2712,
              "lng": -97.7389,
              "url": "https://example.com/festival",
              "date_hint": "Saturday",
              "passed_rules": ["budget_ok", "loc_ok", "free_slot_saturday_afternoon"],
              "prometheux_verified": true,
              "filter_method": "sdk",
              "match_score": 3
            }
          ],
          "source": "tavily",
          "center_lat": 30.2672,
          "center_lng": -97.7431,
          "filter_stats": {
            "candidates_in": 12,
            "candidates_out": 5,
            "filter_method": "sdk",
            "concept_name": "weekend_planner_matches"
          }
        }
        """
        let response = try JSONDecoder().decode(DiscoverResponse.self, from: Data(json.utf8))
        XCTAssertEqual(response.location, "Austin, TX")
        XCTAssertEqual(response.events.count, 1)
        XCTAssertEqual(response.centerLat, 30.2672)
        XCTAssertEqual(response.filterStats?.candidatesOut, 5)

        let event = try XCTUnwrap(response.events.first)
        XCTAssertEqual(event.id, "disc_1")
        XCTAssertEqual(event.imageURL, "/images/events/festival-crowd.jpg")
        XCTAssertEqual(event.priceLabel, "Free")
        XCTAssertTrue(event.prometheuxVerified)
        XCTAssertEqual(event.matchScore, 3)
        XCTAssertEqual(event.passedRules.count, 3)
    }

    func testDiscoverEventToleratesMissingOptionalFields() throws {
        let json = """
        { "id": "disc_2", "title": "Mystery Event", "lat": 1.0, "lng": 2.0 }
        """
        let event = try JSONDecoder().decode(DiscoverEvent.self, from: Data(json.utf8))
        XCTAssertEqual(event.id, "disc_2")
        XCTAssertEqual(event.priceLabel, "See details")
        XCTAssertFalse(event.prometheuxVerified)
        XCTAssertTrue(event.passedRules.isEmpty)
    }

    func testPlanResultDecoding() throws {
        let json = """
        {
          "itinerary": [
            {
              "time": "Saturday 14:00",
              "activity": "Live music",
              "venue": "Saturday Jazz",
              "cost": "$25",
              "diet_access": "vegetarian",
              "source_url": "https://example.com/jazz",
              "source_index": 1
            }
          ],
          "cited_path": "/workspace/cited.md",
          "trace_id": "abc-123",
          "filter_stats": {
            "candidates_in": 16,
            "candidates_out": 5,
            "filter_method": "sdk"
          }
        }
        """
        let result = try JSONDecoder().decode(PlanResult.self, from: Data(json.utf8))
        XCTAssertEqual(result.itinerary.count, 1)
        XCTAssertEqual(result.citedPath, "/workspace/cited.md")
        XCTAssertEqual(result.traceID, "abc-123")
        XCTAssertEqual(result.filterStats.candidatesIn, 16)
        XCTAssertNil(result.filterStats.conceptName)

        let item = try XCTUnwrap(result.itinerary.first)
        XCTAssertEqual(item.dietAccess, "vegetarian")
        XCTAssertEqual(item.sourceURL, "https://example.com/jazz")
        XCTAssertEqual(item.sourceIndex, 1)
    }

    func testCalendarSlotRoundTrip() throws {
        let slots = [
            CalendarSlot(date: "saturday", period: .afternoon),
            CalendarSlot(date: "sunday", period: .morning),
        ]
        let data = try JSONEncoder().encode(slots)
        let decoded = try JSONDecoder().decode([CalendarSlot].self, from: data)
        XCTAssertEqual(decoded, slots)

        let string = try XCTUnwrap(String(data: data, encoding: .utf8))
        XCTAssertTrue(string.contains("\"period\":\"afternoon\""))
        XCTAssertTrue(string.contains("\"date\":\"saturday\""))
    }

    func testPlanRequestEncodesSnakeCase() throws {
        let request = PlanRequest(
            location: "Austin, TX",
            budget: 150,
            diet: "vegan",
            activities: "music",
            accessibility: "wheelchair",
            calendarSlots: [CalendarSlot(date: "saturday", period: .evening)]
        )
        let data = try JSONEncoder().encode(request)
        let string = try XCTUnwrap(String(data: data, encoding: .utf8))
        XCTAssertTrue(string.contains("\"calendar_slots\""))
        XCTAssertTrue(string.contains("\"budget\":150"))
    }

    func testFormatRuleBadge() {
        XCTAssertEqual(formatRuleBadge("budget_ok"), "Budget")
        XCTAssertEqual(formatRuleBadge("loc_ok"), "Location")
        XCTAssertEqual(formatRuleBadge("diet_match"), "Diet")
        XCTAssertEqual(formatRuleBadge("free_slot_saturday_afternoon"), "Free Saturday Afternoon")
        XCTAssertEqual(formatRuleBadge("some_other_rule"), "Some Other Rule")
    }
}
