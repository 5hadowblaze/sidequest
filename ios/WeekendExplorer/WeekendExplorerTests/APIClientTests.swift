import XCTest
@testable import WeekendExplorer

final class APIClientTests: XCTestCase {
    private let backendURL = URL(string: "http://127.0.0.1:8000")!
    private var client: APIClient!

    override func setUp() {
        super.setUp()
        client = APIClient(backendURL: backendURL)
    }

    func testDiscoverURLIncludesLocationOnly() throws {
        let query = DiscoverQuery(location: "Austin, TX")
        let url = try client.discoverURL(for: query)

        XCTAssertEqual(url.path, "/discover")
        XCTAssertTrue(url.absoluteString.contains("location=Austin%2C%20TX"))
        XCTAssertNil(url.query?.contains("budget="))
    }

    func testDiscoverURLIncludesProfileConstraints() throws {
        let profile = UserProfile(
            homeCity: "Austin, TX",
            budget: 150,
            diet: "vegan",
            activities: "music",
            accessibility: "wheelchair",
            onboardingComplete: true,
            updatedAt: ""
        )
        let query = DiscoverQuery(location: "Austin, TX", profile: profile)
        let url = try client.discoverURL(for: query)
        let queryString = try XCTUnwrap(url.query)

        XCTAssertTrue(queryString.contains("budget=150"))
        XCTAssertTrue(queryString.contains("diet=vegan"))
        XCTAssertTrue(queryString.contains("activities=music"))
        XCTAssertTrue(queryString.contains("accessibility=wheelchair"))
    }

    func testDiscoverURLIncludesCalendarSlotsJSON() throws {
        let slots = [
            CalendarSlot(date: "saturday", period: .afternoon),
            CalendarSlot(date: "sunday", period: .morning),
        ]
        let profile = UserProfile(
            homeCity: "Austin, TX",
            budget: 100,
            diet: "vegetarian",
            activities: "food",
            accessibility: nil,
            onboardingComplete: true,
            updatedAt: ""
        )
        let query = DiscoverQuery(
            location: "Austin, TX",
            profile: profile,
            calendarSlots: slots
        )
        let url = try client.discoverURL(for: query)
        let queryString = try XCTUnwrap(url.query)

        XCTAssertTrue(queryString.contains("calendar_slots="))
        XCTAssertTrue(queryString.contains("saturday"))
        XCTAssertTrue(queryString.contains("afternoon"))
        XCTAssertTrue(queryString.contains("sunday"))
        XCTAssertTrue(queryString.contains("morning"))
    }

    func testDiscoverURLOmitsBlankAccessibility() throws {
        let profile = UserProfile(
            homeCity: "Austin, TX",
            budget: 50,
            diet: "none",
            activities: "outdoors",
            accessibility: "   ",
            onboardingComplete: true,
            updatedAt: ""
        )
        let query = DiscoverQuery(location: "Austin, TX", profile: profile)
        let url = try client.discoverURL(for: query)
        let queryString = try XCTUnwrap(url.query)

        XCTAssertFalse(queryString.contains("accessibility="))
    }
}
