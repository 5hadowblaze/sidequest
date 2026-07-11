import SwiftUI

struct EventDetailView: View {
    let event: DiscoverEvent
    @Environment(ExplorerViewModel.self) private var vm
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                hero
                VStack(alignment: .leading, spacing: Space.lg) {
                    badgeRow
                    Text(event.title)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                    Text(event.description)
                        .font(.sqBody)
                        .foregroundStyle(Theme.textMuted)

                    if !event.passedRules.isEmpty {
                        VStack(alignment: .leading, spacing: Space.sm) {
                            Text("Why it passed").font(.sqCaption).foregroundStyle(Theme.textFaint)
                            FlowLayout(spacing: 8, rowSpacing: 8) {
                                ForEach(event.passedRules, id: \.self) { RuleBadge(rule: $0) }
                            }
                        }
                    }

                    locationCard

                    if case .error(let message) = vm.planState {
                        Text(message)
                            .font(.sqCaption)
                            .foregroundStyle(Theme.coral)
                            .padding(Space.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.coralSoft, in: RoundedRectangle(cornerRadius: Radius.md))
                    }

                    planButton

                    Text("Sourced via Tavily · verified by Prometheux · itinerary formatted by Gemini")
                        .font(.sqMicro)
                        .foregroundStyle(Theme.textFaint)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, Space.sm)
                }
                .padding(.horizontal, Space.xl)
                .padding(.bottom, Space.xxxl)
            }
        }
        .scrollIndicators(.hidden)
        .background(Theme.background.ignoresSafeArea())
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
        .sheet(isPresented: planPresented) {
            if let result = vm.planResult {
                PlanResultsView(result: result, eventTitle: event.title)
            }
        }
    }

    private var hero: some View {
        EventImageView(raw: event.imageURL)
            .frame(height: 240)
            .frame(maxWidth: .infinity)
            .clipped()
            .overlay(LinearGradient(colors: [.clear, Theme.background], startPoint: .center, endPoint: .bottom))
            .overlay(alignment: .topTrailing) {
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                        .frame(width: 34, height: 34)
                        .sqGlassCircle()
                }
                .padding(Space.lg)
            }
            .ignoresSafeArea(edges: .top)
    }

    private var badgeRow: some View {
        HStack(spacing: Space.sm) {
            if event.prometheuxVerified { VerifiedBadge() }
            Text(event.priceLabel)
                .font(.sqCaption).foregroundStyle(.white)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.logoGradient, in: Capsule())
            if let hint = event.dateHint, !hint.isEmpty {
                Label(hint, systemImage: "calendar")
                    .font(.sqCaption).foregroundStyle(Theme.textMuted)
            }
            Spacer()
        }
    }

    private var locationCard: some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            Label(event.location, systemImage: "mappin.and.ellipse")
                .font(.sqCallout).foregroundStyle(Theme.textPrimary)
            if let url = URL(string: event.url), !event.url.isEmpty {
                Button {
                    openURL(url)
                } label: {
                    Label("View source", systemImage: "arrow.up.right.square")
                        .font(.sqCaption)
                        .foregroundStyle(Theme.purpleBright)
                }
            }
        }
        .padding(Space.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .sqGlassCard(cornerRadius: Radius.lg)
    }

    private var planButton: some View {
        Button {
            Task { await vm.plan(for: event) }
        } label: {
            HStack(spacing: Space.sm) {
                if vm.planState == .loading {
                    QuestSpinner(size: 18, lineWidth: 2)
                    Text("Planning your quest…")
                } else {
                    Image(systemName: "sparkles")
                    Text("Plan this weekend")
                }
            }
        }
        .buttonStyle(.sqPrimary)
        .disabled(vm.planState == .loading)
    }

    private var planPresented: Binding<Bool> {
        Binding(
            get: { vm.planResult != nil },
            set: { if !$0 { vm.dismissPlan() } }
        )
    }
}
