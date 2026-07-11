import XCTest
@testable import Sidequest

final class APIClientTests: XCTestCase {
    private let base = URL(string: "http://127.0.0.1:8000")!

    private func components(_ url: URL) -> [String: String] {
        let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var dict: [String: String] = [:]
        for item in comps?.queryItems ?? [] { dict[item.name] = item.value }
        return dict
    }

    func testDiscoverURLLocationOnly() throws {
        let query = DiscoverQuery(location: "Austin, TX", budget: nil, diet: "", activities: "", accessibility: nil, calendarSlots: [])
        let url = try APIClient.discoverURL(base: base, query: query)
        XCTAssertTrue(url.path.hasSuffix("/discover"))
        let params = components(url)
        XCTAssertEqual(params["location"], "Austin, TX")
        XCTAssertNil(params["budget"])
        XCTAssertNil(params["diet"])
        XCTAssertNil(params["calendar_slots"])
    }

    func testDiscoverURLWithConstraints() throws {
        let query = DiscoverQuery(
            location: "Austin, TX",
            budget: 150,
            diet: "vegan",
            activities: "music",
            accessibility: "  ",
            calendarSlots: [CalendarSlot(date: "saturday", period: .afternoon)]
        )
        let url = try APIClient.discoverURL(base: base, query: query)
        let params = components(url)
        XCTAssertEqual(params["budget"], "150")
        XCTAssertEqual(params["diet"], "vegan")
        XCTAssertEqual(params["activities"], "music")
        // Whitespace-only accessibility is omitted.
        XCTAssertNil(params["accessibility"])
        let slots = try XCTUnwrap(params["calendar_slots"])
        XCTAssertTrue(slots.contains("saturday"))
        XCTAssertTrue(slots.contains("afternoon"))
    }

    func testDiscoverURLOmitsZeroBudget() throws {
        let query = DiscoverQuery(location: "X", budget: 0, diet: "", activities: "", accessibility: nil, calendarSlots: [])
        let url = try APIClient.discoverURL(base: base, query: query)
        XCTAssertNil(components(url)["budget"])
    }
}
