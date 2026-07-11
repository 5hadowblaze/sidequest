import Foundation
import EventKit

/// Derives free weekend slots (morning / afternoon / evening) from the device
/// calendar, with a mock fallback when access is denied or unavailable.
@MainActor
final class CalendarService {
    private let store = EKEventStore()

    struct PeriodWindow {
        let period: CalendarPeriod
        let startHour: Int
        let endHour: Int
    }

    static let windows: [PeriodWindow] = [
        .init(period: .morning, startHour: 8, endHour: 12),
        .init(period: .afternoon, startHour: 12, endHour: 17),
        .init(period: .evening, startHour: 17, endHour: 22),
    ]

    /// Returns free slots for the next two weekends, or mock slots on failure.
    func freeWeekendSlots(now: Date = Date()) async -> [CalendarSlot] {
        let granted = await requestAccess()
        guard granted else { return Self.mockWeekendFreeSlots() }

        let dates = Self.nextTwoWeekendDates(from: now)
        guard let first = dates.first, let last = dates.last else {
            return Self.mockWeekendFreeSlots()
        }

        let cal = Calendar.current
        let start = cal.startOfDay(for: first)
        let end = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: last)) ?? last
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        let events = store.events(matching: predicate)

        let slots = Self.deriveFreeSlots(weekendDates: dates, busyEvents: events, calendar: cal)
        return slots.isEmpty ? Self.mockWeekendFreeSlots() : slots
    }

    private func requestAccess() async -> Bool {
        if #available(iOS 17.0, *) {
            return (try? await store.requestFullAccessToEvents()) ?? false
        } else {
            return await withCheckedContinuation { cont in
                store.requestAccess(to: .event) { granted, _ in cont.resume(returning: granted) }
            }
        }
    }

    // MARK: - Pure helpers (unit-tested)

    /// The upcoming Saturday & Sunday, plus the following weekend (4 dates).
    static func nextTwoWeekendDates(from date: Date, calendar: Calendar = .current) -> [Date] {
        let weekday = calendar.component(.weekday, from: date) // 1 = Sun ... 7 = Sat
        let daysUntilSaturday = (7 - weekday + 7) % 7 // 0 if today is Saturday
        guard let firstSaturday = calendar.date(
            byAdding: .day, value: daysUntilSaturday, to: calendar.startOfDay(for: date)
        ) else { return [] }

        var dates: [Date] = []
        for weekendOffset in 0..<2 {
            for dayOffset in 0..<2 { // Sat, Sun
                if let d = calendar.date(
                    byAdding: .day, value: weekendOffset * 7 + dayOffset, to: firstSaturday
                ) { dates.append(d) }
            }
        }
        return dates
    }

    static func dayToken(for date: Date, calendar: Calendar = .current) -> String {
        let weekday = calendar.component(.weekday, from: date)
        return weekday == 7 ? "saturday" : "sunday"
    }

    static func deriveFreeSlots(
        weekendDates: [Date],
        busyEvents: [EKEvent],
        calendar: Calendar = .current
    ) -> [CalendarSlot] {
        var seen = Set<String>()
        var slots: [CalendarSlot] = []

        for date in weekendDates {
            let token = dayToken(for: date, calendar: calendar)
            for window in windows {
                guard
                    let winStart = calendar.date(bySettingHour: window.startHour, minute: 0, second: 0, of: date),
                    let winEnd = calendar.date(bySettingHour: window.endHour, minute: 0, second: 0, of: date)
                else { continue }

                let isBusy = busyEvents.contains { event in
                    guard let s = event.startDate, let e = event.endDate else { return false }
                    return s < winEnd && e > winStart
                }
                guard !isBusy else { continue }

                let slot = CalendarSlot(date: token, period: window.period)
                if seen.insert(slot.id).inserted { slots.append(slot) }
            }
        }
        return slots
    }

    static func mockWeekendFreeSlots() -> [CalendarSlot] {
        [
            CalendarSlot(date: "saturday", period: .morning),
            CalendarSlot(date: "saturday", period: .afternoon),
            CalendarSlot(date: "saturday", period: .evening),
            CalendarSlot(date: "sunday", period: .morning),
            CalendarSlot(date: "sunday", period: .afternoon),
        ]
    }
}
