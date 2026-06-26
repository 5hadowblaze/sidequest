import SwiftUI

struct EventDetailView: View {
    let event: DiscoverEvent
    let planStatus: PlannerStatus
    let planError: String?
    let onClose: () -> Void
    let onPlan: () -> Void

    private static let success = Color(hex: "#137333")
    private static let successLight = Color(hex: "#e6f4ea")

    private var isPlanning: Bool {
        planStatus == .planning
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                heroImage
                contentSection
            }
        }
        .background(.white)
    }

    private var heroImage: some View {
        ZStack(alignment: .topLeading) {
            AsyncImage(url: URL(string: event.imageURL)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure, .empty:
                    Rectangle()
                        .fill(BrandTheme.surface)
                        .overlay {
                            if case .empty = phase {
                                ProgressView().tint(BrandTheme.accent)
                            }
                        }
                @unknown default:
                    Rectangle().fill(BrandTheme.surface)
                }
            }
            .frame(height: 200)
            .frame(maxWidth: .infinity)
            .clipped()

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(BrandTheme.muted)
                    .frame(width: 36, height: 36)
                    .background(.white.opacity(0.95))
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
            }
            .buttonStyle(.plain)
            .padding(12)
            .accessibilityLabel("Close details")
        }
    }

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            badgeRow

            if let rules = event.passedRules, !rules.isEmpty {
                FlowBadgeRow(rules: rules)
            }

            Text(event.title)
                .font(.title3.weight(.medium))
                .foregroundStyle(BrandTheme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(event.description)
                .font(.subheadline)
                .foregroundStyle(BrandTheme.muted)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)

            locationCard

            if let planError {
                Text(planError)
                    .font(.subheadline)
                    .foregroundStyle(BrandTheme.error)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color(hex: "#fce8e6"))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            planButton

            Text("Uses your profile constraints + this event via Tavily → Prometheux → Gemini")
                .font(.caption)
                .foregroundStyle(BrandTheme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
        .padding(20)
    }

    private var badgeRow: some View {
        FlowBadgeRowStatic {
            detailBadge(event.category, foreground: BrandTheme.accent, background: BrandTheme.badgeBackground)
            detailBadge(event.priceLabel, foreground: Self.success, background: Self.successLight, semibold: true)
            if event.prometheuxVerified {
                detailBadge("Prometheux verified", foreground: .white, background: Self.success, semibold: true)
            }
            if let dateHint = event.dateHint {
                detailBadge(dateHint, foreground: BrandTheme.muted, background: BrandTheme.surface)
            }
        }
    }

    private func detailBadge(
        _ text: String,
        foreground: Color,
        background: Color,
        semibold: Bool = false
    ) -> some View {
        Text(text)
            .font(.caption.weight(semibold ? .semibold : .medium))
            .foregroundStyle(foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(background)
            .clipShape(Capsule())
    }

    private var locationCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 4) {
                Text("Where:")
                    .fontWeight(.medium)
                    .foregroundStyle(BrandTheme.textPrimary)
                Text(event.location)
                    .foregroundStyle(BrandTheme.textSecondary)
            }
            .font(.subheadline)

            Text("Coordinates: \(event.lat.formatted(.number.precision(.fractionLength(4)))), \(event.lng.formatted(.number.precision(.fractionLength(4))))")
                .font(.subheadline)
                .foregroundStyle(BrandTheme.textSecondary)

            if let url = URL(string: event.url) {
                Link(destination: url) {
                    HStack(spacing: 4) {
                        Text("View source")
                        Image(systemName: "arrow.right")
                            .font(.caption)
                    }
                    .font(.subheadline)
                    .foregroundStyle(BrandTheme.accent)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(BrandTheme.surfaceLight)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var planButton: some View {
        Button(action: onPlan) {
            HStack(spacing: 8) {
                if isPlanning {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                        .scaleEffect(0.9)
                }
                Text(isPlanning ? "Planning with Prometheux…" : "Plan this weekend")
                    .font(.subheadline.weight(.medium))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(BrandTheme.accent.opacity(isPlanning ? 0.7 : 1))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(isPlanning)
        .accessibilityIdentifier("planWeekendButton")
    }
}

private struct FlowBadgeRow: View {
    let rules: [String]

    var body: some View {
        FlowBadgeRowStatic {
            ForEach(rules, id: \.self) { rule in
                Text(formatRuleBadge(rule))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(BrandTheme.accent)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(BrandTheme.badgeBackground)
                    .clipShape(Capsule())
            }
        }
    }
}

private struct FlowBadgeRowStatic<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        FlowLayout(spacing: 8) {
            content()
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

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
    EventDetailView(
        event: DiscoverEvent(
            id: "1",
            title: "Sunset Jazz in the Park",
            description: "Live music under the stars with local food vendors and craft cocktails.",
            category: "Live music",
            imageURL: "https://picsum.photos/400/250",
            priceEstimate: 25,
            priceLabel: "$25",
            location: "Zilker Park, Austin",
            lat: 30.2672,
            lng: -97.7431,
            url: "https://example.com",
            dateHint: "Saturday evening",
            passedRules: ["budget_ok", "loc_ok"],
            prometheuxVerified: true,
            filterMethod: "sdk",
            matchScore: 92
        ),
        planStatus: .idle,
        planError: nil,
        onClose: {},
        onPlan: {}
    )
}
