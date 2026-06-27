import Foundation
import Observation

@Observable
@MainActor
final class ExplorerViewModel {
    // MARK: - Auth

    let authService: AuthService

    var isSignedIn: Bool { authService.user != nil }
    var displayName: String? { authService.user?.displayName }
    var email: String? { authService.user?.email }
    var isAuthLoading: Bool { authService.isLoading }
    var isMockAuth: Bool { authService.isMockAuth }

    // MARK: - Profile

    private(set) var profile: UserProfile?
    private(set) var profileLoading = false
    var showOnboarding = false

    // MARK: - Calendar

    private(set) var calendarSlots: [CalendarSlot] = []
    private(set) var calendarLoading = false

    // MARK: - Discover

    private(set) var events: [DiscoverEvent] = []
    private(set) var mapCenter = MapCoordinate(lat: 37.7749, lng: -122.4194)
    private(set) var discoverLoading = false
    private(set) var discoverError: String?
    private(set) var discoverSource: String?
    private(set) var filterStatsSummary: String?

    // MARK: - Selection & planning

    var selectedEventID: String?
    private(set) var planStatus: PlannerStatus = .idle
    private(set) var planError: String?
    private(set) var planResult: PlanResult?

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let profileService: ProfileService
    private let calendarService: CalendarService

    init(
        apiClient: APIClient = APIClient(),
        profileService: ProfileService = ProfileService(),
        calendarService: CalendarService = CalendarService(),
        authService: AuthService? = nil
    ) {
        self.apiClient = apiClient
        self.profileService = profileService
        self.calendarService = calendarService
        self.authService = authService ?? AuthService()
    }

    var selectedEvent: DiscoverEvent? {
        guard let selectedEventID else { return nil }
        return events.first { $0.id == selectedEventID }
    }

    // MARK: - Auth actions

    func signInWithGoogle() async throws {
        try await authService.signInWithGoogle()
        await handleSignedInUser()
    }

    func signOut() async throws {
        try await authService.signOut()
        clearProfileState()
    }

    func bootstrapIfSignedIn() async {
        guard let uid = authService.user?.uid else {
            clearProfileState()
            return
        }
        await loadProfile(for: uid)
        await loadCalendarSlots()
    }

    private func handleSignedInUser() async {
        guard let uid = authService.user?.uid else { return }
        await loadProfile(for: uid)
        await loadCalendarSlots()
    }

    // MARK: - Profile

    func loadProfile(for userID: String) async {
        profileLoading = true
        defer { profileLoading = false }

        do {
            let saved = try await profileService.loadProfile(userID: userID)
            profile = saved
            showOnboarding = saved?.onboardingComplete != true
        } catch {
            profile = nil
            showOnboarding = true
        }
    }

    func saveProfile(for userID: String, profile: UserProfile) async throws {
        try await profileService.saveProfile(userID: userID, profile: profile)
        self.profile = profile
        showOnboarding = false
        await refreshDiscoverIfReady()
    }

    func clearProfileState() {
        profile = nil
        profileLoading = false
        showOnboarding = false
        calendarSlots = []
        events = []
        selectedEventID = nil
        discoverError = nil
        discoverSource = nil
        filterStatsSummary = nil
        planStatus = .idle
        planError = nil
        planResult = nil
    }

    // MARK: - Calendar

    func loadCalendarSlots() async {
        guard authService.user != nil else {
            calendarSlots = []
            return
        }

        calendarLoading = true
        defer { calendarLoading = false }

        do {
            calendarSlots = try await calendarService.loadWeekendFreeSlots(useMock: isMockAuth)
        } catch {
            calendarSlots = CalendarService.mockWeekendFreeSlots()
        }

        await refreshDiscoverIfReady()
    }

    // MARK: - Discover

    func loadDiscover(profile: UserProfile, calendarSlots: [CalendarSlot]) async {
        discoverLoading = true
        discoverError = nil
        defer { discoverLoading = false }

        let query = DiscoverQuery(
            location: profile.homeCity,
            profile: profile,
            calendarSlots: calendarSlots
        )

        do {
            let response = try await apiClient.discover(query: query)
            applyDiscoverResponse(response)
        } catch {
            discoverError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func refreshDiscoverIfReady() async {
        guard let profile, profile.onboardingComplete, !calendarLoading else {
            return
        }
        await loadDiscover(profile: profile, calendarSlots: calendarSlots)
    }

    private func applyDiscoverResponse(_ response: DiscoverResponse) {
        events = response.events
        discoverSource = response.source

        if let stats = response.filterStats {
            filterStatsSummary = "\(stats.candidatesIn) → \(stats.candidatesOut) via \(stats.filterMethod)"
        } else {
            filterStatsSummary = nil
        }

        if let lat = response.centerLat, let lng = response.centerLng {
            mapCenter = MapCoordinate(lat: lat, lng: lng)
        } else if let first = response.events.first {
            mapCenter = MapCoordinate(lat: first.lat, lng: first.lng)
        }

        selectedEventID = nil
    }

    // MARK: - Planning

    func planWeekend(around event: DiscoverEvent) async {
        guard let profile else { return }

        planStatus = .planning
        planError = nil
        planResult = nil

        let activities = [
            profile.activities,
            "Focus event: \(event.title) (\(event.category))",
            String(event.description.prefix(200)),
        ].joined(separator: ". ")

        let request = PlanRequest(
            location: profile.homeCity,
            budget: profile.budget,
            diet: profile.diet,
            activities: activities,
            accessibility: profile.accessibility,
            calendarSlots: calendarSlots
        )

        do {
            let result = try await apiClient.plan(request)
            planResult = result
            planStatus = .done
        } catch {
            planStatus = .error
            planError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func selectEvent(id: String?) {
        selectedEventID = id
    }

    func dismissPlan() {
        planStatus = .idle
        planError = nil
        planResult = nil
    }
}

struct MapCoordinate: Equatable, Sendable {
    var lat: Double
    var lng: Double
}
