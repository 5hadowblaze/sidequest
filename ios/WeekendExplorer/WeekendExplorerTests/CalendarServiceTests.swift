import XCTest
@testable import WeekendExplorer

final class CalendarServiceTests: XCTestCase {
    private var calendar: Calendar!
    private var service: CalendarService!

    override func setUp() {
        super.setUp()
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/Chicago")!
        calendar = cal
        service = CalendarService(calendar: cal)
    }

    func testNextTwoWeekendDatesFromWednesday() {
        // Wednesday, June 25, 2025
        var components = DateComponents()
        components.year = 2025
        components.month = 6
        components.day = 25
        let reference = calendar.date(from: components)!

        let dates = service.nextTwoWeekendDates(reference: reference)

        XCTAssertEqual(dates.count, 4)
        XCTAssertEqual(calendar.component(.weekday, from: dates[0]), 7) // Saturday
        XCTAssertEqual(calendar.component(.weekday, from: dates[1]), 1) // Sunday
        XCTAssertEqual(calendar.component(.weekday, from: dates[2]), 7) // next Saturday
        XCTAssertEqual(calendar.component(.weekday, from: dates[3]), 1) // next Sunday
        XCTAssertEqual(calendar.component(.day, from: dates[0]), 28)
        XCTAssertEqual(calendar.component(.day, from: dates[1]), 29)
        XCTAssertEqual(calendar.component(.day, from: dates[2]), 5)
        XCTAssertEqual(calendar.component(.day, from: dates[3]), 6)
    }

    func testNextTwoWeekendDatesFromSaturdayIncludesToday() {
        // Saturday, June 28, 2025
        var components = DateComponents()
        components.year = 2025
        components.month = 6
        components.day = 28
        let reference = calendar.date(from: components)!

        let dates = service.nextTwoWeekendDates(reference: reference)

        XCTAssertEqual(calendar.component(.day, from: dates[0]), 28)
        XCTAssertEqual(calendar.component(.day, from: dates[1]), 29)
    }

    func testDayTokenReturnsLowercaseWeekday() {
        var components = DateComponents()
        components.year = 2025
        components.month = 6
        components.day = 28
        let saturday = calendar.date(from: components)!

        XCTAssertEqual(service.dayToken(for: saturday), "saturday")
    }

    func testMockWeekendFreeSlots() {
        let slots = CalendarService.mockWeekendFreeSlots()

        XCTAssertEqual(slots.count, 5)
        XCTAssertEqual(slots[0], CalendarSlot(date: "saturday", period: .morning))
        XCTAssertEqual(slots[2], CalendarSlot(date: "saturday", period: .evening))
        XCTAssertEqual(slots[4], CalendarSlot(date: "sunday", period: .afternoon))
    }

    func testDeriveFreeSlotsExcludesBusyAfternoon() {
        var saturdayComponents = DateComponents()
        saturdayComponents.year = 2025
        saturdayComponents.month = 6
        saturdayComponents.day = 28
        let saturday = calendar.date(from: saturdayComponents)!

        let busyStart = calendar.date(bySettingHour: 13, minute: 0, second: 0, of: saturday)!
        let busyEnd = calendar.date(bySettingHour: 14, minute: 0, second: 0, of: saturday)!

        let slots = service.deriveFreeSlots(
            weekendDates: [saturday],
            busyBlocks: [(start: busyStart, end: busyEnd)]
        )

        XCTAssertFalse(slots.contains(CalendarSlot(date: "saturday", period: .afternoon)))
        XCTAssertTrue(slots.contains(CalendarSlot(date: "saturday", period: .morning)))
        XCTAssertTrue(slots.contains(CalendarSlot(date: "saturday", period: .evening)))
    }
}
