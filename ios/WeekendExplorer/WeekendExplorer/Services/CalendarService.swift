import EventKit
import Foundation

enum CalendarServiceError: LocalizedError {
    case accessDenied
    case eventStoreUnavailable

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "Calendar access was denied."
        case .eventStoreUnavailable:
            return "The calendar store is unavailable."
        }
    }
}

struct CalendarService: Sendable {
    private let calendar: Calendar

    init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    func requestAccess() async throws -> Bool {
        let store = EKEventStore()
        if #available(iOS 17.0, *) {
            return try await store.requestFullAccessToEvents()
        }
        return try await withCheckedThrowingContinuation { continuation in
            store.requestAccess(to: .event) { granted, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    /// Loads free weekend slots from EventKit, or mock slots when `useMock` is true.
    func loadWeekendFreeSlots(useMock: Bool) async throws -> [CalendarSlot] {
        if useMock {
            return Self.mockWeekendFreeSlots()
        }

        let store = EKEventStore()
        let granted: Bool
        do {
            granted = try await requestAccess()
        } catch {
            return Self.mockWeekendFreeSlots()
        }

        guard granted else {
            return Self.mockWeekendFreeSlots()
        }

        let weekendDates = nextTwoWeekendDates()
        guard
            let rangeStart = startOfDay(weekendDates.first ?? Date()),
            let lastDay = weekendDates.last,
            let rangeEnd = calendar.date(byAdding: .day, value: 1, to: startOfDay(lastDay))
        else {
            return Self.mockWeekendFreeSlots()
        }

        let predicate = store.predicateForEvents(withStart: rangeStart, end: rangeEnd, calendars: nil)
        let events = store.events(matching: predicate)
        let busyBlocks = events.compactMap { event -> (start: Date, end: Date)? in
            guard let start = event.startDate, let end = event.endDate else { return nil }
            return (start, end)
        }

        return deriveFreeSlots(weekendDates: weekendDates, busyBlocks: busyBlocks)
    }

    /// Upcoming Saturday/Sunday dates for this weekend and next.
    func nextTwoWeekendDates(reference: Date = Date()) -> [Date] {
        let today = startOfDay(reference)
        let weekday = calendar.component(.weekday, from: today)
        // Calendar weekday: Sunday = 1, Saturday = 7
        let daysUntilSaturday = (7 - weekday + 7) % 7

        let thisSaturday = addDays(to: today, days: daysUntilSaturday)
        let thisSunday = addDays(to: thisSaturday, days: 1)
        let nextSaturday = addDays(to: thisSaturday, days: 7)
        let nextSunday = addDays(to: nextSaturday, days: 1)

        return [thisSaturday, thisSunday, nextSaturday, nextSunday]
    }

    func dayToken(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: date).lowercased()
    }

    /// Demo slots when Firebase/calendar access is unavailable.
    static func mockWeekendFreeSlots() -> [CalendarSlot] {
        [
            CalendarSlot(date: "saturday", period: .morning),
            CalendarSlot(date: "saturday", period: .afternoon),
            CalendarSlot(date: "saturday", period: .evening),
            CalendarSlot(date: "sunday", period: .morning),
            CalendarSlot(date: "sunday", period: .afternoon),
        ]
    }

    func deriveFreeSlots(
        weekendDates: [Date],
        busyBlocks: [(start: Date, end: Date)]
    ) -> [CalendarSlot] {
        var slots: [CalendarSlot] = []

        for date in weekendDates {
            let token = dayToken(for: date)
            for period in CalendarPeriod.allCases {
                let window = periodWindow(on: date, period: period)
                if !overlapsBusy(window: window, busyBlocks: busyBlocks) {
                    slots.append(CalendarSlot(date: token, period: period))
                }
            }
        }

        return slots
    }

    // MARK: - Private

    private func startOfDay(_ date: Date) -> Date {
        calendar.startOfDay(for: date)
    }

    private func addDays(to date: Date, days: Int) -> Date {
        calendar.date(byAdding: .day, value: days, to: date) ?? date
    }

    private func periodWindow(
        on date: Date,
        period: CalendarPeriod
    ) -> (start: Date, end: Date) {
        let hours: (start: Int, end: Int) = switch period {
        case .morning: (8, 12)
        case .afternoon: (12, 17)
        case .evening: (17, 22)
        }

        let start = calendar.date(
            bySettingHour: hours.start,
            minute: 0,
            second: 0,
            of: date
        ) ?? date
        let end = calendar.date(
            bySettingHour: hours.end,
            minute: 0,
            second: 0,
            of: date
        ) ?? date
        return (start, end)
    }

    private func overlapsBusy(
        window: (start: Date, end: Date),
        busyBlocks: [(start: Date, end: Date)]
    ) -> Bool {
        busyBlocks.contains { block in
            block.start < window.end && block.end > window.start
        }
    }
}
