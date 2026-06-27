import SwiftUI

struct PlanResultsSheet: View {
    let result: PlanResult
    let eventTitle: String?
    let onClose: () -> Void

    @Environment(\.dismiss) private var dismiss

    private static let success = Color(hex: "#137333")
    private static let successLight = Color(hex: "#e6f4ea")

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    filterStatsBanner(result.filterStats)

                    VStack(spacing: 12) {
                        ForEach(Array(result.itinerary.enumerated()), id: \.offset) { index, item in
                            itineraryCard(item, index: index)
                        }
                    }

                    citedPathCard
                }
                .padding(20)
            }
            .background(.white)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("YOUR WEEKEND PLAN")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(BrandTheme.accent)
                            .tracking(0.8)

                        if let eventTitle {
                            Text("Inspired by: \(eventTitle)")
                                .font(.caption)
                                .foregroundStyle(BrandTheme.muted)
                                .lineLimit(1)
                        }
                    }
                }

                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        onClose()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .symbolRenderingMode(.hierarchical)
                            .foregroundStyle(BrandTheme.muted)
                    }
                    .accessibilityLabel("Close plan")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
    }

    private func filterStatsBanner(_ stats: FilterStats) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Prometheux gate")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(BrandTheme.accentDark)

            Text(
                "\(stats.candidatesIn) candidates in → \(stats.candidatesOut) verified out via \(stats.filterMethod) (\(stats.conceptName))"
            )
            .font(.caption)
            .foregroundStyle(BrandTheme.accentDark.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(BrandTheme.badgeBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(BrandTheme.accent.opacity(0.2), lineWidth: 1)
        )
    }

    private func itineraryCard(_ item: ItineraryItem, index: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.time)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(BrandTheme.accent)

                    Text(item.venue)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(BrandTheme.textPrimary)

                    Text(item.activity)
                        .font(.subheadline)
                        .foregroundStyle(BrandTheme.muted)
                }

                Spacer(minLength: 12)

                Text(item.cost)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Self.success)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.white)
                    .clipShape(Capsule())
            }

            if !item.dietAccess.isEmpty, item.dietAccess != "—" {
                Text(item.dietAccess)
                    .font(.caption)
                    .foregroundStyle(BrandTheme.muted)
            }
        }
        .padding(14)
        .background(BrandTheme.surfaceLight)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(BrandTheme.borderLight, lineWidth: 1)
        )
        .accessibilityIdentifier("itineraryItem_\(index)")
    }

    private var citedPathCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text("Saved to")
                    .foregroundStyle(Self.success)
                Text(result.citedPath)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(Self.success)
            }
            .font(.subheadline)

            if let traceID = result.traceID, !traceID.isEmpty {
                Text("Trace: \(traceID)")
                    .font(.caption)
                    .foregroundStyle(Self.success.opacity(0.8))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Self.successLight)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

#Preview {
    Color.clear
        .sheet(isPresented: .constant(true)) {
            PlanResultsSheet(
                result: PlanResult(
                    itinerary: [
                        ItineraryItem(
                            time: "10:00 AM",
                            activity: "Brunch at a vegan café",
                            venue: "Green Leaf Café",
                            cost: "$18",
                            dietAccess: "Vegan options confirmed",
                            sourceURL: "https://example.com",
                            sourceIndex: 0
                        ),
                    ],
                    citedPath: "cited/weekend-plan-abc123.json",
                    traceID: "trace-xyz",
                    filterStats: FilterStats(
                        candidatesIn: 12,
                        candidatesOut: 4,
                        filterMethod: "sdk",
                        conceptName: "weekend_constraints"
                    )
                ),
                eventTitle: "Sunset Jazz",
                onClose: {}
            )
        }
}
