import SwiftUI
import MapKit

struct EventMapView: View {
    let events: [DiscoverEvent]
    let center: CLLocationCoordinate2D
    @Binding var selectedID: String?

    @State private var camera: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $camera) {
            ForEach(events) { event in
                Annotation(
                    event.title,
                    coordinate: CLLocationCoordinate2D(latitude: event.lat, longitude: event.lng),
                    anchor: .center
                ) {
                    GlowingMapPin(isSelected: selectedID == event.id)
                        .onTapGesture {
                            Haptics.tap()
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                selectedID = event.id
                            }
                        }
                }
                .annotationTitles(.hidden)
            }
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .onAppear { recenter(to: center) }
        .onChange(of: [center.latitude, center.longitude]) { _, _ in recenter(to: center) }
        .onChange(of: selectedID) { _, id in focus(on: id) }
        .overlay(alignment: .topLeading) { legend }
    }

    private var legend: some View {
        HStack(spacing: Space.sm) {
            Circle().fill(Theme.purple).frame(width: 8, height: 8)
            Text("\(events.count) verified nearby")
                .font(.sqCaption)
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(.horizontal, Space.md)
        .padding(.vertical, Space.sm)
        .sqGlassPill()
        .padding(Space.lg)
    }

    private func recenter(to coordinate: CLLocationCoordinate2D) {
        withAnimation(.easeInOut(duration: 0.6)) {
            camera = .region(MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
            ))
        }
    }

    private func focus(on id: String?) {
        guard let id, let event = events.first(where: { $0.id == id }) else { return }
        withAnimation(.easeInOut(duration: 0.55)) {
            camera = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: event.lat, longitude: event.lng),
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            ))
        }
    }
}

/// A pulsing purple pin with a teal ripple when selected.
struct GlowingMapPin: View {
    var isSelected: Bool
    @State private var pulse = false

    var body: some View {
        ZStack {
            if isSelected {
                Circle()
                    .stroke(Theme.teal.opacity(0.6), lineWidth: 2)
                    .frame(width: pulse ? 44 : 26, height: pulse ? 44 : 26)
                    .opacity(pulse ? 0 : 0.8)
            }
            Circle()
                .fill(Theme.purple.opacity(0.25))
                .frame(width: isSelected ? 30 : 22, height: isSelected ? 30 : 22)
                .blur(radius: 4)
            Circle()
                .fill(Theme.logoGradient)
                .frame(width: isSelected ? 20 : 14, height: isSelected ? 20 : 14)
                .overlay(Circle().strokeBorder(.white.opacity(0.7), lineWidth: 1.5))
                .shadow(color: Theme.purple.opacity(0.7), radius: 6)
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isSelected)
        .onAppear {
            guard isSelected else { return }
            withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { pulse = true }
        }
        .onChange(of: isSelected) { _, selected in
            pulse = false
            if selected {
                withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { pulse = true }
            }
        }
    }
}
