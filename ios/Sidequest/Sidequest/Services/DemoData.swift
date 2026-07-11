import Foundation
import CoreLocation

/// Seeded content for demo mode (no Firebase / backend required).
/// Mirrors the shape the backend returns so the UI is identical to live mode.
enum DemoData {
    static let defaultCenter = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)

    static let cityCoordinates: [String: CLLocationCoordinate2D] = [
        "san francisco": .init(latitude: 37.7749, longitude: -122.4194),
        "new york": .init(latitude: 40.7128, longitude: -74.0060),
        "austin": .init(latitude: 30.2672, longitude: -97.7431),
        "los angeles": .init(latitude: 34.0522, longitude: -118.2437),
        "london": .init(latitude: 51.5074, longitude: -0.1278),
        "seattle": .init(latitude: 47.6062, longitude: -122.3321),
        "chicago": .init(latitude: 41.8781, longitude: -87.6298),
    ]

    static func center(for city: String) -> CLLocationCoordinate2D {
        let key = city.lowercased().trimmingCharacters(in: .whitespaces)
        for (name, coord) in cityCoordinates where key.contains(name) {
            return coord
        }
        return defaultCenter
    }

    private struct Seed {
        let title: String
        let category: String
        let description: String
        let price: Double
        let priceLabel: String
        let dateHint: String
        let image: String
        let rules: [String]
    }

    private static let seeds: [Seed] = [
        Seed(title: "Rooftop Jazz & Wine Popup", category: "Popup",
             description: "Sunset live jazz on a downtown rooftop with natural wines and small plates. Intimate, golden-hour vibes with a skyline backdrop.",
             price: 25, priceLabel: "$25", dateHint: "Saturday",
             image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "activity_match", "free_slot_saturday_evening"]),
        Seed(title: "Neighborhood Street Festival", category: "Festival",
             description: "Free outdoor block party with food trucks, local makers, live bands, and family-friendly games across four car-free blocks.",
             price: 0, priceLabel: "Free", dateHint: "Saturday",
             image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "diet_match", "activity_match", "access_match", "free_slot_saturday_afternoon"]),
        Seed(title: "Weekend Makers Market", category: "Market",
             description: "Handmade goods, roasters, and plant-based street food from 40+ local vendors in a sunlit warehouse space.",
             price: 0, priceLabel: "Free", dateHint: "Sunday",
             image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "diet_match", "free_slot_sunday_morning"]),
        Seed(title: "Outdoor Film Night", category: "Concert",
             description: "A cult classic under the stars in the park. Bring a blanket; food trucks and a small bar on site.",
             price: 15, priceLabel: "$15", dateHint: "Saturday",
             image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "free_slot_saturday_evening"]),
        Seed(title: "Coastal Hike & Shuttle Day Trip", category: "Travel",
             description: "Guided cliffside hike with round-trip shuttle, ocean views, and a picnic stop. All fitness levels welcome.",
             price: 40, priceLabel: "$40", dateHint: "Sunday",
             image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "activity_match", "free_slot_sunday_afternoon"]),
        Seed(title: "Gallery Opening: New Voices", category: "Art",
             description: "Opening night for emerging local artists — mixed media, live music, and complimentary drinks.",
             price: 0, priceLabel: "Free", dateHint: "Saturday",
             image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=80",
             rules: ["budget_ok", "loc_ok", "access_match", "free_slot_saturday_evening"]),
    ]

    static func events(location: String) -> [DiscoverEvent] {
        let base = center(for: location)
        return seeds.enumerated().map { index, seed in
            let jitterLat = (Double((index * 37) % 100) - 50) / 900.0
            let jitterLng = (Double((index * 53) % 100) - 50) / 900.0
            return DiscoverEvent(
                id: "demo_\(index + 1)",
                title: seed.title,
                description: seed.description,
                category: seed.category,
                imageURL: seed.image,
                priceEstimate: seed.price,
                priceLabel: seed.priceLabel,
                location: location.isEmpty ? "Your city" : location,
                lat: base.latitude + jitterLat,
                lng: base.longitude + jitterLng,
                url: "https://example.com/events/demo_\(index + 1)",
                dateHint: seed.dateHint,
                passedRules: seed.rules,
                prometheuxVerified: true,
                filterMethod: "demo",
                matchScore: seed.rules.count
            )
        }
    }

    static func response(location: String) -> DiscoverResponse {
        let evs = events(location: location)
        let center = center(for: location)
        return DiscoverResponse(
            location: location,
            events: evs,
            source: "demo",
            centerLat: center.latitude,
            centerLng: center.longitude,
            filterStats: FilterStats(
                candidatesIn: 12,
                candidatesOut: evs.count,
                filterMethod: "demo",
                conceptName: "weekend_planner_matches"
            )
        )
    }

    static func plan(for event: DiscoverEvent, profile: UserProfile) -> PlanResult {
        let dining = profile.diet.isEmpty ? "Local favorite" : "\(profile.diet.capitalized)-friendly spot"
        let items = [
            ItineraryItem(
                time: "Saturday 14:00",
                activity: event.category,
                venue: event.title,
                cost: event.priceLabel,
                dietAccess: profile.accessibility?.isEmpty == false ? profile.accessibility! : "—",
                sourceURL: event.url,
                sourceIndex: 1
            ),
            ItineraryItem(
                time: "Saturday 19:00",
                activity: "Dining",
                venue: dining,
                cost: "$35",
                dietAccess: profile.diet.isEmpty ? "—" : profile.diet,
                sourceURL: "https://example.com/dining",
                sourceIndex: 2
            ),
            ItineraryItem(
                time: "Sunday 10:30",
                activity: "Morning stroll",
                venue: "Weekend Makers Market",
                cost: "Free",
                dietAccess: "—",
                sourceURL: "https://example.com/events/demo_3",
                sourceIndex: 3
            ),
        ]
        return PlanResult(
            itinerary: items,
            citedPath: "/workspace/cited.md",
            traceID: "demo-trace-\(UUID().uuidString.prefix(8))",
            filterStats: FilterStats(
                candidatesIn: 16,
                candidatesOut: items.count,
                filterMethod: "demo",
                conceptName: "weekend_planner_matches"
            )
        )
    }
}
