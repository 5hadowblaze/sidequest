import Foundation

// MARK: - Calendar

enum CalendarPeriod: String, Codable, CaseIterable, Sendable, Identifiable {
    case morning, afternoon, evening
    var id: String { rawValue }

    var label: String {
        switch self {
        case .morning: "Morning"
        case .afternoon: "Afternoon"
        case .evening: "Evening"
        }
    }
}

struct CalendarSlot: Codable, Equatable, Hashable, Sendable, Identifiable {
    let date: String   // "saturday" | "sunday" | ISO date
    let period: CalendarPeriod

    var id: String { "\(date)_\(period.rawValue)" }
}

// MARK: - Profile & auth

struct UserProfile: Codable, Equatable, Sendable {
    var homeCity: String
    var budget: Double?
    var diet: String
    var activities: String
    var accessibility: String?
    var onboardingComplete: Bool
    var updatedAt: Date?

    static let empty = UserProfile(
        homeCity: "",
        budget: nil,
        diet: "",
        activities: "",
        accessibility: nil,
        onboardingComplete: false,
        updatedAt: nil
    )
}

struct AuthUser: Equatable, Sendable {
    let uid: String
    let displayName: String?
    let email: String?
    let photoURL: String?
}

// MARK: - Discover

struct DiscoverEvent: Codable, Identifiable, Equatable, Sendable {
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
    let passedRules: [String]
    let prometheuxVerified: Bool
    let filterMethod: String?
    let matchScore: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, description, category
        case imageURL = "image_url"
        case priceEstimate = "price_estimate"
        case priceLabel = "price_label"
        case location, lat, lng, url
        case dateHint = "date_hint"
        case passedRules = "passed_rules"
        case prometheuxVerified = "prometheux_verified"
        case filterMethod = "filter_method"
        case matchScore = "match_score"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "Local event"
        imageURL = try c.decodeIfPresent(String.self, forKey: .imageURL) ?? ""
        priceEstimate = try c.decodeIfPresent(Double.self, forKey: .priceEstimate)
        priceLabel = try c.decodeIfPresent(String.self, forKey: .priceLabel) ?? "See details"
        location = try c.decodeIfPresent(String.self, forKey: .location) ?? ""
        lat = try c.decodeIfPresent(Double.self, forKey: .lat) ?? 0
        lng = try c.decodeIfPresent(Double.self, forKey: .lng) ?? 0
        url = try c.decodeIfPresent(String.self, forKey: .url) ?? ""
        dateHint = try c.decodeIfPresent(String.self, forKey: .dateHint)
        passedRules = try c.decodeIfPresent([String].self, forKey: .passedRules) ?? []
        prometheuxVerified = try c.decodeIfPresent(Bool.self, forKey: .prometheuxVerified) ?? false
        filterMethod = try c.decodeIfPresent(String.self, forKey: .filterMethod)
        matchScore = try c.decodeIfPresent(Int.self, forKey: .matchScore)
    }

    /// Memberwise init used by demo data and previews.
    init(
        id: String, title: String, description: String, category: String,
        imageURL: String, priceEstimate: Double?, priceLabel: String,
        location: String, lat: Double, lng: Double, url: String, dateHint: String?,
        passedRules: [String] = [], prometheuxVerified: Bool = false,
        filterMethod: String? = nil, matchScore: Int? = nil
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.category = category
        self.imageURL = imageURL
        self.priceEstimate = priceEstimate
        self.priceLabel = priceLabel
        self.location = location
        self.lat = lat
        self.lng = lng
        self.url = url
        self.dateHint = dateHint
        self.passedRules = passedRules
        self.prometheuxVerified = prometheuxVerified
        self.filterMethod = filterMethod
        self.matchScore = matchScore
    }
}

struct FilterStats: Codable, Equatable, Sendable {
    let candidatesIn: Int
    let candidatesOut: Int
    let filterMethod: String
    let conceptName: String?

    enum CodingKeys: String, CodingKey {
        case candidatesIn = "candidates_in"
        case candidatesOut = "candidates_out"
        case filterMethod = "filter_method"
        case conceptName = "concept_name"
    }
}

struct DiscoverResponse: Codable, Equatable, Sendable {
    let location: String
    let events: [DiscoverEvent]
    let source: String?
    let centerLat: Double?
    let centerLng: Double?
    let filterStats: FilterStats?

    enum CodingKeys: String, CodingKey {
        case location, events, source
        case centerLat = "center_lat"
        case centerLng = "center_lng"
        case filterStats = "filter_stats"
    }
}

// MARK: - Plan

struct ItineraryItem: Codable, Identifiable, Equatable, Sendable {
    var id: String { "\(time)-\(venue)" }
    let time: String
    let activity: String
    let venue: String
    let cost: String
    let dietAccess: String
    let sourceURL: String
    let sourceIndex: Int

    enum CodingKeys: String, CodingKey {
        case time, activity, venue, cost
        case dietAccess = "diet_access"
        case sourceURL = "source_url"
        case sourceIndex = "source_index"
    }
}

struct PlanRequest: Codable, Sendable {
    let location: String
    let budget: Double
    let diet: String
    let activities: String
    let accessibility: String?
    let calendarSlots: [CalendarSlot]

    enum CodingKeys: String, CodingKey {
        case location, budget, diet, activities, accessibility
        case calendarSlots = "calendar_slots"
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

// MARK: - Rule badge labels (parity with web `formatRuleBadge`)

func formatRuleBadge(_ rule: String) -> String {
    switch rule {
    case "budget_ok": return "Budget"
    case "loc_ok": return "Location"
    case "diet_match": return "Diet"
    case "activity_match": return "Activity"
    case "access_match": return "Accessible"
    case "slot_ok": return "Free time"
    default:
        if rule.hasPrefix("free_slot_") {
            let parts = rule
                .replacingOccurrences(of: "free_slot_", with: "")
                .split(separator: "_")
                .map { $0.capitalized }
            return "Free \(parts.joined(separator: " "))"
        }
        return rule
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }
}
