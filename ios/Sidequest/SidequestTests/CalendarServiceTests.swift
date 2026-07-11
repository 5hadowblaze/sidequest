import XCTest
import EventKit
@testable import Sidequest

final class CalendarServiceTests: XCTestCase {
    private var calendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    private func date(_ iso: String) -> Date {
        let f = ISO8601DateFormatter()
        f.timeZone = TimeZone(identifier: "UTC")!
        return f.date(from: iso)!
    }

    func testNextTwoWeekendDatesFromWednesday() {
        // 2026-07-08 is a Wednesday.
        let wed = date("2026-07-08T09:00:00Z")
        let dates = CalendarService.nextTwoWeekendDates(from: wed, calendar: calendar)
        XCTAssertEqual(dates.count, 4)
        // First should be Saturday 2026-07-11.
        XCTAssertEqual(CalendarService.dayToken(for: dates[0], calendar: calendar), "saturday")
        XCTAssertEqual(CalendarService.dayToken(for: dates[1], calendar: calendar), "sunday")
        XCTAssertEqual(CalendarService.dayToken(for: dates[2], calendar: calendar), "saturday")
    }

    func testNextTwoWeekendDatesFromSaturday() {
        // 2026-07-11 is a Saturday — should include today.
        let sat = date("2026-07-11T09:00:00Z")
        let dates = CalendarService.nextTwoWeekendDates(from: sat, calendar: calendar)
        XCTAssertEqual(CalendarService.dayToken(for: dates[0], calendar: calendar), "saturday")
        XCTAssertEqual(calendar.component(.day, from: dates[0]), 11)
    }

    func testMockWeekendFreeSlots() {
        let slots = CalendarService.mockWeekendFreeSlots()
        XCTAssertEqual(slots.count, 5)
        XCTAssertTrue(slots.contains(CalendarSlot(date: "saturday", period: .morning)))
        XCTAssertTrue(slots.contains(CalendarSlot(date: "sunday", period: .afternoon)))
    }

    func testDeriveFreeSlotsExcludesBusyWindows() {
        let sat = date("2026-07-11T00:00:00Z")
        let store = EKEventStore()
        let busy = EKEvent(eventStore: store)
        // Busy 13:00–15:00 UTC → overlaps the Saturday afternoon window (12–17).
        busy.startDate = date("2026-07-11T13:00:00Z")
        busy.endDate = date("2026-07-11T15:00:00Z")

        let slots = CalendarService.deriveFreeSlots(
            weekendDates: [sat],
            busyEvents: [busy],
            calendar: calendar
        )
        XCTAssertTrue(slots.contains(CalendarSlot(date: "saturday", period: .morning)))
        XCTAssertTrue(slots.contains(CalendarSlot(date: "saturday", period: .evening)))
        XCTAssertFalse(slots.contains(CalendarSlot(date: "saturday", period: .afternoon)))
    }
}
