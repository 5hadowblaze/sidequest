import SwiftUI

struct ExplorerView: View {
    @Environment(ExplorerViewModel.self) private var vm

    var body: some View {
        GeometryReader { geo in
            let mapHeight = max(geo.size.height * 0.42, 280)
            ZStack(alignment: .top) {
                Theme.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    EventMapView(
                        events: vm.events,
                        center: vm.mapCenter,
                        selectedID: selectionBinding
                    )
                    .frame(height: mapHeight)
                    .ignoresSafeArea(edges: .top)

                    DiscoverTray()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Theme.background)
                        .clipShape(UnevenRoundedRectangle(
                            topLeadingRadius: Radius.sheet, topTrailingRadius: Radius.sheet
                        ))
                        .offset(y: -Radius.sheet)
                        .overlay(alignment: .top) {
                            Capsule().fill(Theme.borderStrong)
                                .frame(width: 40, height: 5)
                                .padding(.top, Space.md)
                                .offset(y: -Radius.sheet)
                        }
                }

                header
            }
        }
        .accessibilityIdentifier("explorerView")
        .sheet(isPresented: onboardingBinding) {
            OnboardingView()
        }
        .sheet(item: selectionItemBinding) { event in
            EventDetailView(event: event)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: Space.md) {
            BrandLogo(size: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text("Sidequest").font(.sqHeadline).foregroundStyle(Theme.textPrimary)
                Text("your weekend, verified").font(.sqMicro).foregroundStyle(Theme.textMuted)
            }
            Spacer()
            UserMenuView(
                user: vm.auth.currentUser,
                isMockAuth: vm.isMockAuth,
                onEditPreferences: { vm.editPreferences() },
                onSignOut: { vm.signOut() }
            )
        }
        .padding(.horizontal, Space.lg)
        .padding(.vertical, Space.sm)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(.white.opacity(0.08), lineWidth: 0.75))
        .padding(.horizontal, Space.lg)
        .padding(.top, Space.sm)
    }

    // MARK: - Bindings

    private var selectionBinding: Binding<String?> {
        Binding(get: { vm.selectedEventID }, set: { vm.select($0) })
    }

    private var selectionItemBinding: Binding<DiscoverEvent?> {
        Binding(get: { vm.selectedEvent }, set: { vm.select($0?.id) })
    }

    private var onboardingBinding: Binding<Bool> {
        Binding(get: { vm.showOnboarding }, set: { vm.showOnboarding = $0 })
    }
}

/// The scrollable event list beneath the map.
private struct DiscoverTray: View {
    @Environment(ExplorerViewModel.self) private var vm

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.lg) {
                titleBlock
                content
            }
            .padding(.horizontal, Space.lg)
            .padding(.top, Space.xl)
            .padding(.bottom, Space.xxxl)
        }
        .scrollIndicators(.hidden)
        .refreshable { await vm.refreshDiscover() }
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("This weekend near \(vm.profile.homeCity.isEmpty ? "you" : vm.profile.homeCity)")
                .font(.sqTitle)
                .foregroundStyle(Theme.textPrimary)
            HStack(spacing: Space.sm) {
                if let summary = vm.filterStatsSummary {
                    Label(summary, systemImage: "checkmark.seal")
                        .foregroundStyle(Theme.tealBright)
                }
                if vm.usingDemoData {
                    Text("· sample data").foregroundStyle(Theme.textFaint)
                }
            }
            .font(.sqCaption)
        }
    }

    @ViewBuilder private var content: some View {
        switch vm.discoverState {
        case .idle, .loading:
            VStack(spacing: Space.md) {
                PipelineFlow()
                ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
            }
        case .error(let message):
            ErrorBanner(message: message) { Task { await vm.refreshDiscover() } }
        case .empty:
            EmptyState { Task { await vm.refreshDiscover() } }
        case .loaded:
            LazyVStack(spacing: Space.lg) {
                ForEach(Array(vm.events.enumerated()), id: \.element.id) { index, event in
                    EventCardView(
                        event: event,
                        isSelected: vm.selectedEventID == event.id
                    ) {
                        Haptics.tap()
                        vm.select(event.id)
                    }
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
        }
    }
}

private struct SkeletonCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Shimmer().frame(height: 150)
            VStack(alignment: .leading, spacing: Space.sm) {
                Shimmer().frame(width: 80, height: 10).clipShape(Capsule())
                Shimmer().frame(height: 16).clipShape(RoundedRectangle(cornerRadius: 4))
                Shimmer().frame(width: 160, height: 12).clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(Space.lg)
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.card))
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay(RoundedRectangle(cornerRadius: Radius.card).strokeBorder(Theme.border, lineWidth: 0.75))
    }
}

private struct ErrorBanner: View {
    let message: String
    let retry: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Label("Couldn't load events", systemImage: "exclamationmark.triangle.fill")
                .font(.sqHeadline)
                .foregroundStyle(Theme.coral)
            Text(message).font(.sqCaption).foregroundStyle(Theme.textMuted)
            Button("Try again", action: retry)
                .buttonStyle(SQGlassButtonStyle(tint: Theme.coral, height: 44))
        }
        .padding(Space.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.coralSoft, in: RoundedRectangle(cornerRadius: Radius.card))
    }
}

private struct EmptyState: View {
    let retry: () -> Void
    var body: some View {
        VStack(spacing: Space.md) {
            Image(systemName: "map").font(.system(size: 40)).foregroundStyle(Theme.textFaint)
            Text("No events found for this weekend.").font(.sqBody).foregroundStyle(Theme.textMuted)
            Button("Refresh", action: retry).buttonStyle(SQGlassButtonStyle(height: 44))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.xxxl)
    }
}
