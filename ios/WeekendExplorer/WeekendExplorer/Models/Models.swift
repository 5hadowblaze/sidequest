import Foundation

// MARK: - Calendar

enum CalendarPeriod: String, Codable, CaseIterable, Sendable {
    case morning
    case afternoon
    case evening
}

struct CalendarSlot: Codable, Equatable, Hashable, Sendable {
    let date: String
    let period: CalendarPeriod
}

// MARK: - Planning

struct PlanRequest: Codable, Equatable, Sendable {
    let location: String
    let budget: Double
    let diet: String
    let activities: String
    var accessibility: String?
    var calendarSlots: [CalendarSlot]

    enum CodingKeys: String, CodingKey {
        case location
        case budget
        case diet
        case activities
        case accessibility
        case calendarSlots = "calendar_slots"
    }
}

struct ItineraryItem: Codable, Equatable, Identifiable, Sendable {
    let time: String
    let activity: String
    let venue: String
    let cost: String
    let dietAccess: String
    let sourceURL: String
    let sourceIndex: Int

    var id: String { "\(sourceIndex)-\(time)-\(venue)" }

    enum CodingKeys: String, CodingKey {
        case time
        case activity
        case venue
        case cost
        case dietAccess = "diet_access"
        case sourceURL = "source_url"
        case sourceIndex = "source_index"
    }
}

struct FilterStats: Codable, Equatable, Sendable {
    let candidatesIn: Int
    let candidatesOut: Int
    let filterMethod: String
    let conceptName: String

    enum CodingKeys: String, CodingKey {
        case candidatesIn = "candidates_in"
        case candidatesOut = "candidates_out"
        case filterMethod = "filter_method"
        case conceptName = "concept_name"
    }
}

struct PlanResult: Codable, Equatable, Sendable {
    let itinerary: [ItineraryItem]
    let citedPath: String
    let traceID: String?
    let filterStats: FilterStats

    enum CodingKeys: String, CodingKey {
        case itinerary
        case citedPath = "cited_path"
        case traceID = "trace_id"
        case filterStats = "filter_stats"
    }
}

// MARK: - Discover

struct DiscoverEvent: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let description: String
    let category: String
    let imageURL: String
    let priceEstimate: Double?
    let priceLabel: String
    let location: String
    let lat: Double
    let lng: Double
    let url: String
    let dateHint: String?
    let passedRules: [String]?
    let prometheuxVerified: Bool
    let filterMethod: String?
    let matchScore: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case category
        case imageURL = "image_url"
        case priceEstimate = "price_estimate"
        case priceLabel = "price_label"
        case location
        case lat
        case lng
        case url
        case dateHint = "date_hint"
        case passedRules = "passed_rules"
        case prometheuxVerified = "prometheux_verified"
        case filterMethod = "filter_method"
        case matchScore = "match_score"
    }
}

struct DiscoverResponse: Codable, Equatable, Sendable {
    let location: String
    let events: [DiscoverEvent]
    let source: String
    let centerLat: Double?
    let centerLng: Double?
    let filterStats: FilterStats?

    enum CodingKeys: String, CodingKey {
        case location
        case events
        case source
        case centerLat = "center_lat"
        case centerLng = "center_lng"
        case filterStats = "filter_stats"
    }
}

// MARK: - Profile & Auth

struct UserProfile: Codable, Equatable, Sendable {
    var homeCity: String
    var budget: Double
    var diet: String
    var activities: String
    var accessibility: String?
    var onboardingComplete: Bool
    var updatedAt: String
}

struct AuthUser: Codable, Equatable, Sendable {
    let uid: String
    let displayName: String?
    let email: String?
    let photoURL: String?
}

// MARK: - Discover query

struct DiscoverQuery: Equatable, Sendable {
    let location: String
    var profile: UserProfile?
    var calendarSlots: [CalendarSlot] = []

    init(location: String, profile: UserProfile? = nil, calendarSlots: [CalendarSlot] = []) {
        self.location = location
        self.profile = profile
        self.calendarSlots = calendarSlots
    }

    var budget: Double? { profile?.budget }
    var diet: String? { profile?.diet }
    var activities: String? { profile?.activities }
    var accessibility: String? { profile?.accessibility }
}

// MARK: - Planner status

enum PlannerStatus: Equatable, Sendable {
    case idle
    case planning
    case done
    case error
}

// MARK: - Rule badge formatting

/// Human-readable label for Prometheux rule badges (matches web `formatRuleBadge`).
func formatRuleBadge(_ rule: String) -> String {
    let labels: [String: String] = [
        "budget_ok": "Budget",
        "loc_ok": "Location",
        "diet_match": "Diet",
        "activity_match": "Activities",
        "access_match": "Access",
        "slot_ok": "Schedule",
    ]

    if let label = labels[rule] {
        return label
    }

    if rule.hasPrefix("free_slot_") {
        let remainder = String(rule.dropFirst("free_slot_".count))
        let parts = remainder.split(separator: "_", omittingEmptySubsequences: false).map(String.init)
        let period = parts.last ?? ""
        let day = parts.dropLast().joined(separator: " ")
        return "Free \(day) \(period)"
    }

    return rule.replacingOccurrences(of: "_", with: " ")
}
