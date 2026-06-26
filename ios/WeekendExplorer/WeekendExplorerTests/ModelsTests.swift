import XCTest
@testable import WeekendExplorer

final class ModelsTests: XCTestCase {
    func testDiscoverResponseDecodesFromJSON() throws {
        let json = """
        {
          "location": "Austin, TX",
          "events": [
            {
              "id": "evt-1",
              "title": "Live Music Night",
              "description": "Outdoor concert in downtown Austin.",
              "category": "music",
              "image_url": "https://example.com/image.jpg",
              "price_estimate": 25.0,
              "price_label": "$25",
              "location": "Austin, TX",
              "lat": 30.2672,
              "lng": -97.7431,
              "url": "https://example.com/event",
              "date_hint": "Saturday evening",
              "passed_rules": ["budget_ok", "loc_ok"],
              "prometheux_verified": true,
              "filter_method": "sdk",
              "match_score": 92
            }
          ],
          "source": "tavily",
          "center_lat": 30.2672,
          "center_lng": -97.7431,
          "filter_stats": {
            "candidates_in": 12,
            "candidates_out": 4,
            "filter_method": "sdk",
            "concept_name": "weekend_planner_matches"
          }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(DiscoverResponse.self, from: json)

        XCTAssertEqual(response.location, "Austin, TX")
        XCTAssertEqual(response.source, "tavily")
        XCTAssertEqual(response.events.count, 1)
        XCTAssertEqual(response.events[0].id, "evt-1")
        XCTAssertEqual(response.events[0].title, "Live Music Night")
        XCTAssertEqual(response.events[0].passedRules, ["budget_ok", "loc_ok"])
        XCTAssertTrue(response.events[0].prometheuxVerified)
        XCTAssertEqual(response.centerLat, 30.2672)
        XCTAssertEqual(response.filterStats?.candidatesIn, 12)
        XCTAssertEqual(response.filterStats?.conceptName, "weekend_planner_matches")
    }

    func testPlanResultDecodesFromJSON() throws {
        let json = """
        {
          "itinerary": [
            {
              "time": "Saturday 10:00 AM",
              "activity": "Brunch",
              "venue": "Cafe Momentum",
              "cost": "$28",
              "diet_access": "Vegan options",
              "source_url": "https://example.com/brunch",
              "source_index": 1
            },
            {
              "time": "Saturday 2:00 PM",
              "activity": "Live music",
              "venue": "Mohawk Austin",
              "cost": "$35",
              "diet_access": "All ages",
              "source_url": "https://example.com/music",
              "source_index": 2
            }
          ],
          "cited_path": "cited.md",
          "trace_id": "trace-abc-123",
          "filter_stats": {
            "candidates_in": 8,
            "candidates_out": 3,
            "filter_method": "sdk",
            "concept_name": "weekend_planner_matches"
          }
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(PlanResult.self, from: json)

        XCTAssertEqual(result.itinerary.count, 2)
        XCTAssertEqual(result.itinerary[0].activity, "Brunch")
        XCTAssertEqual(result.itinerary[0].dietAccess, "Vegan options")
        XCTAssertEqual(result.itinerary[1].sourceIndex, 2)
        XCTAssertEqual(result.citedPath, "cited.md")
        XCTAssertEqual(result.traceID, "trace-abc-123")
        XCTAssertEqual(result.filterStats.candidatesOut, 3)
        XCTAssertEqual(result.filterStats.filterMethod, "sdk")
    }

    func testCalendarSlotRoundTrip() throws {
        let slot = CalendarSlot(date: "saturday", period: .afternoon)
        let data = try JSONEncoder().encode([slot])
        let decoded = try JSONDecoder().decode([CalendarSlot].self, from: data)
        XCTAssertEqual(decoded, [slot])
    }
}
