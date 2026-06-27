import SwiftUI

struct ExplorerView: View {
    @Environment(ExplorerViewModel.self) private var viewModel

    var body: some View {
        @Bindable var viewModel = viewModel

        VStack(spacing: 0) {
            header

            GeometryReader { geometry in
                VStack(spacing: 0) {
                    EventMapView(
                        events: viewModel.events,
                        center: viewModel.mapCenter,
                        selectedEventID: viewModel.selectedEventID,
                        onSelectEvent: { id in
                            viewModel.selectEvent(id: id)
                        }
                    )
                    .frame(height: geometry.size.height * 0.35)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(BrandTheme.borderLight)
                            .frame(height: 1)
                    }

                    if let event = viewModel.selectedEvent {
                        EventDetailView(
                            event: event,
                            planStatus: viewModel.planStatus,
                            planError: viewModel.planError,
                            onClose: { viewModel.selectEvent(id: nil) },
                            onPlan: {
                                Task { await viewModel.planWeekend(around: event) }
                            }
                        )
                    } else {
                        eventListSection
                    }
                }
            }
        }
        .background(BrandTheme.surfaceLight)
        .sheet(isPresented: $viewModel.showOnboarding) {
            OnboardingView(initialProfile: viewModel.profile) { profile in
                Task {
                    guard let uid = viewModel.authService.user?.uid else { return }
                    try? await viewModel.saveProfile(for: uid, profile: profile)
                }
            }
        }
        .sheet(isPresented: planResultsPresented) {
            if let result = viewModel.planResult {
                PlanResultsSheet(
                    result: result,
                    eventTitle: viewModel.selectedEvent?.title,
                    onClose: { viewModel.dismissPlan() }
                )
            }
        }
        .accessibilityIdentifier("explorerView")
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            BrandLogo(size: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text("Sidequest")
                    .font(.headline)
                    .foregroundStyle(BrandTheme.textPrimary)

                Text("your weekend, verified")
                    .font(.caption)
                    .foregroundStyle(BrandTheme.muted)
            }

            Spacer()

            if let user = viewModel.authService.user {
                UserMenuView(
                    user: user,
                    homeCity: viewModel.profile?.homeCity,
                    isMockAuth: viewModel.isMockAuth,
                    onSignOut: {
                        Task { try? await viewModel.signOut() }
                    },
                    onEditProfile: {
                        viewModel.showOnboarding = true
                    }
                )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.white)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(BrandTheme.borderLight)
                .frame(height: 1)
        }
    }

    private var eventListSection: some View {
        VStack(spacing: 0) {
            listHeader

            Group {
                if viewModel.discoverLoading {
                    LoadingView(message: "Finding local events…")
                } else if let error = viewModel.discoverError {
                    errorState(error)
                } else if viewModel.events.isEmpty {
                    emptyState
                } else {
                    eventScrollView
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.white)
        }
    }

    private var listHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("This weekend near \(viewModel.profile?.homeCity ?? "you")")
                .font(.title3.weight(.medium))
                .foregroundStyle(BrandTheme.textPrimary)

            Text(listSubtitle)
                .font(.subheadline)
                .foregroundStyle(BrandTheme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(.white)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(BrandTheme.borderLight)
                .frame(height: 1)
        }
    }

    private var listSubtitle: String {
        var parts = ["Popups, festivals, conferences, pub hangouts & more"]

        if let source = viewModel.discoverSource {
            var meta = "via \(source)"
            if let stats = viewModel.filterStatsSummary {
                meta += " · Prometheux \(stats)"
            }
            if !viewModel.calendarSlots.isEmpty {
                meta += " · \(viewModel.calendarSlots.count) free slots"
            }
            parts.append(meta)
        }

        return parts.joined(separator: " · ")
    }

    private var eventScrollView: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.events, id: \.id) { event in
                    EventCardView(
                        event: event,
                        isSelected: viewModel.selectedEventID == event.id,
                        onTap: { viewModel.selectEvent(id: event.id) }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
        }
        .refreshable {
            await viewModel.refreshDiscoverIfReady()
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(BrandTheme.error)
                .multilineTextAlignment(.center)
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(Color(hex: "#fce8e6"))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .padding(20)
            Spacer()
        }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("No events found. Try updating your home city in preferences.")
                .font(.subheadline)
                .foregroundStyle(BrandTheme.muted)
                .multilineTextAlignment(.center)
                .padding(24)
            Spacer()
        }
    }

    private var planResultsPresented: Binding<Bool> {
        Binding(
            get: { viewModel.planResult != nil },
            set: { isPresented in
                if !isPresented {
                    viewModel.dismissPlan()
                }
            }
        )
    }
}

#Preview {
    ExplorerView()
        .environment(ExplorerViewModel())
}
