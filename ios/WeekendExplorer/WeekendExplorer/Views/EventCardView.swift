import SwiftUI
import UIKit

struct EventCardView: View {
    let event: DiscoverEvent
    let isSelected: Bool
    let onTap: () -> Void

    private var passedRules: [String] {
        event.passedRules ?? []
    }

    private static let success = Color(hex: "#137333")

    var body: some View {
        Button(action: handleTap) {
            VStack(alignment: .leading, spacing: 0) {
                imageSection
                detailsSection
            }
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(selectionOverlay)
            .shadow(color: .black.opacity(isSelected ? 0.1 : 0.05), radius: isSelected ? 8 : 4, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("eventCard_\(event.id)")
    }

    private var imageSection: some View {
        ZStack(alignment: .topLeading) {
            AsyncImage(url: URL(string: event.imageURL)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    imagePlaceholder
                case .empty:
                    imagePlaceholder
                        .overlay {
                            ProgressView()
                                .tint(BrandTheme.accent)
                        }
                @unknown default:
                    imagePlaceholder
                }
            }
            .frame(height: 140)
            .frame(maxWidth: .infinity)
            .clipped()

            HStack {
                categoryBadge
                Spacer()
                priceBadge
            }
            .padding(12)

            if event.prometheuxVerified {
                prometheuxBadge
                    .padding(.leading, 12)
                    .padding(.top, 44)
            }
        }
        .background(BrandTheme.surface)
    }

    private var imagePlaceholder: some View {
        Rectangle()
            .fill(BrandTheme.surface)
    }

    private var categoryBadge: some View {
        Text(event.category)
            .font(.caption.weight(.medium))
            .foregroundStyle(BrandTheme.textSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(.white.opacity(0.95))
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
    }

    private var prometheuxBadge: some View {
        Text("Prometheux ✓")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Self.success.opacity(0.95))
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
    }

    private var priceBadge: some View {
        Text(event.priceLabel)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(BrandTheme.accent)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(event.title)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(BrandTheme.textPrimary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            Text(event.description)
                .font(.subheadline)
                .foregroundStyle(BrandTheme.muted)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            if !passedRules.isEmpty {
                ruleBadges
            }

            HStack {
                Text(event.dateHint ?? "This weekend")
                Spacer(minLength: 8)
                Text(event.location)
                    .lineLimit(1)
            }
            .font(.caption)
            .foregroundStyle(BrandTheme.muted)
        }
        .padding(14)
    }

    private var ruleBadges: some View {
        FlowChipRow(items: Array(passedRules.prefix(4))) { rule in
            Text(formatRuleBadge(rule))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(BrandTheme.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(BrandTheme.badgeBackground)
                .clipShape(Capsule())
        } overflow: {
            if passedRules.count > 4 {
                Text("+\(passedRules.count - 4)")
                    .font(.system(size: 10))
                    .foregroundStyle(BrandTheme.muted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(BrandTheme.surface)
                    .clipShape(Capsule())
            }
        }
    }

    private var selectionOverlay: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(isSelected ? BrandTheme.accent : BrandTheme.borderLight, lineWidth: isSelected ? 2 : 1)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(BrandTheme.accent.opacity(isSelected ? 0.2 : 0), lineWidth: 4)
            )
    }

    private func handleTap() {
        HapticFeedback.selection()
        onTap()
    }
}

enum HapticFeedback {
    static func selection() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

private struct FlowChipRow<Content: View, Overflow: View>: View {
    let items: [String]
    @ViewBuilder let content: (String) -> Content
    @ViewBuilder let overflow: () -> Overflow

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(items, id: \.self) { item in
                content(item)
            }
            overflow()
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}

#Preview {
    EventCardView(
        event: DiscoverEvent(
            id: "1",
            title: "Sunset Jazz in the Park",
            description: "Live music under the stars with local food vendors.",
            category: "Live music",
            imageURL: "https://picsum.photos/400/250",
            priceEstimate: 25,
            priceLabel: "$25",
            location: "Zilker Park",
            lat: 30.2672,
            lng: -97.7431,
            url: "https://example.com",
            dateHint: "Saturday evening",
            passedRules: ["budget_ok", "diet_match"],
            prometheuxVerified: true,
            filterMethod: "sdk",
            matchScore: 92
        ),
        isSelected: true,
        onTap: {}
    )
    .padding()
    .background(BrandTheme.surfaceLight)
}
