import MapKit
import SwiftUI

struct EventMapView: View {
    let events: [DiscoverEvent]
    let center: MapCoordinate
    let selectedEventID: String?
    let onSelectEvent: (String) -> Void

    @State private var position: MapCameraPosition = .automatic
    @State private var mapSelection: String?

    var body: some View {
        Map(position: $position, selection: $mapSelection) {
            ForEach(events, id: \.id) { event in
                Annotation(event.title, coordinate: coordinate(for: event)) {
                    EventMapPin(isSelected: selectedEventID == event.id)
                }
                .tag(event.id)
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .onAppear {
            centerMap(on: center)
            mapSelection = selectedEventID
        }
        .onChange(of: center) { _, newCenter in
            centerMap(on: newCenter)
        }
        .onChange(of: selectedEventID) { _, newValue in
            mapSelection = newValue
        }
        .onChange(of: mapSelection) { _, newValue in
            guard let newValue, newValue != selectedEventID else { return }
            HapticFeedback.selection()
            onSelectEvent(newValue)
        }
    }

    private func coordinate(for event: DiscoverEvent) -> CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: event.lat, longitude: event.lng)
    }

    private func centerMap(on center: MapCoordinate) {
        withAnimation(.easeInOut(duration: 0.35)) {
            position = .region(
                MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: center.lat, longitude: center.lng),
                    latitudinalMeters: 12_000,
                    longitudinalMeters: 12_000
                )
            )
        }
    }
}

private struct EventMapPin: View {
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(BrandTheme.mapPin)
                .frame(width: isSelected ? 18 : 14, height: isSelected ? 18 : 14)
                .shadow(color: .black.opacity(0.25), radius: 3, y: 1)

            Circle()
                .stroke(.white, lineWidth: 2)
                .frame(width: isSelected ? 18 : 14, height: isSelected ? 18 : 14)

            if isSelected {
                Circle()
                    .stroke(BrandTheme.accent.opacity(0.35), lineWidth: 6)
                    .frame(width: 28, height: 28)
            }
        }
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isSelected)
    }
}

#Preview {
    EventMapView(
        events: [
            DiscoverEvent(
                id: "1",
                title: "Jazz Night",
                description: "Live music",
                category: "Music",
                imageURL: "",
                priceEstimate: 20,
                priceLabel: "$20",
                location: "Downtown",
                lat: 30.2672,
                lng: -97.7431,
                url: "https://example.com",
                dateHint: nil,
                passedRules: nil,
                prometheuxVerified: false,
                filterMethod: nil,
                matchScore: nil
            ),
        ],
        center: MapCoordinate(lat: 30.2672, lng: -97.7431),
        selectedEventID: "1",
        onSelectEvent: { _ in }
    )
    .frame(height: 280)
}
