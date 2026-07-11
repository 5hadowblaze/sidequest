import SwiftUI

struct PlanResultsView: View {
    let result: PlanResult
    let eventTitle: String
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var confirmed = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: Space.lg) {
                    headerBlock
                    filterBanner
                    ForEach(Array(result.itinerary.enumerated()), id: \.element.id) { index, item in
                        ItineraryCard(item: item) {
                            if let url = URL(string: item.sourceURL), !item.sourceURL.isEmpty {
                                openURL(url)
                            }
                        }
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    citedCard
                    confirmButton
                }
                .padding(Space.xl)
                .padding(.bottom, Space.xxxl)
            }
            .scrollIndicators(.hidden)

            if confirmed {
                ConfettiView(isActive: confirmed)
            }
        }
        .presentationDetents([.large, .medium])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("YOUR WEEKEND PLAN")
                    .font(.sqMicro).tracking(1).foregroundStyle(Theme.purpleBright)
                Spacer()
                if confirmed {
                    Label("Confirmed", systemImage: "checkmark")
                        .font(.sqMicro)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Theme.teal, in: Capsule())
                }
            }
            Text(confirmed ? "Weekend set 🎉" : "Inspired by \(eventTitle)")
                .font(.sqTitle)
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(.top, Space.md)
    }

    private var filterBanner: some View {
        HStack(spacing: Space.sm) {
            Image(systemName: "line.3.horizontal.decrease.circle.fill")
                .foregroundStyle(Theme.purpleBright)
            Text("Prometheux verified \(result.filterStats.candidatesOut) of \(result.filterStats.candidatesIn) candidates")
                .font(.sqCaption)
                .foregroundStyle(Theme.purpleBright)
            Spacer()
        }
        .padding(Space.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.purpleSoft, in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Theme.purple.opacity(0.3), lineWidth: 0.75))
    }

    private var citedCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Cited sources", systemImage: "doc.text.magnifyingglass")
                .font(.sqCaption).foregroundStyle(Theme.tealBright)
            Text(result.citedPath)
                .font(.sqMono)
                .foregroundStyle(Theme.textMuted)
                .lineLimit(1)
                .truncationMode(.middle)
            if let trace = result.traceID {
                Text("trace: \(trace)")
                    .font(.sqMono).foregroundStyle(Theme.textFaint).lineLimit(1)
            }
        }
        .padding(Space.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.tealSoft, in: RoundedRectangle(cornerRadius: Radius.md))
    }

    private var confirmButton: some View {
        VStack(spacing: Space.sm) {
            Button {
                Haptics.success()
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) { confirmed = true }
            } label: {
                Text(confirmed ? "Weekend confirmed" : "Confirm this weekend")
            }
            .buttonStyle(.sqPrimary)
            .disabled(confirmed)

            Button("Close") { dismiss() }
                .buttonStyle(SQGlassButtonStyle(height: 48))
        }
        .padding(.top, Space.sm)
    }
}

private struct ItineraryCard: View {
    let item: ItineraryItem
    let onSource: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            HStack {
                Text(item.time)
                    .font(.sqCaption).foregroundStyle(Theme.purpleBright)
                Spacer()
                Text(item.cost)
                    .font(.sqCaption).foregroundStyle(Theme.tealBright)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Theme.tealSoft, in: Capsule())
            }
            Text(item.venue)
                .font(.sqHeadline).foregroundStyle(Theme.textPrimary)
            Text(item.activity)
                .font(.sqBody).foregroundStyle(Theme.textMuted)
            HStack {
                if item.dietAccess != "—" && !item.dietAccess.isEmpty {
                    Label(item.dietAccess, systemImage: "leaf")
                        .font(.sqCaption).foregroundStyle(Theme.textFaint)
                }
                Spacer()
                if !item.sourceURL.isEmpty {
                    Button(action: onSource) {
                        Label("Source", systemImage: "arrow.up.right")
                            .font(.sqCaption).foregroundStyle(Theme.purpleBright)
                    }
                }
            }
        }
        .padding(Space.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .sqGlassCard(cornerRadius: Radius.card)
    }
}
