import Foundation
import Observation
import CoreLocation

/// Central app state: auth, profile, calendar, discover, and planning.
@MainActor
@Observable
final class ExplorerViewModel {
    // Services
    let auth: AuthService
    private let profiles = ProfileService()
    private let calendar = CalendarService()
    private lazy var api: APIClient = {
        let authRef = auth
        return APIClient(tokenProvider: { forceRefresh in
            try await authRef.idToken(forceRefresh: forceRefresh)
        })
    }()

    // Profile
    var profile: UserProfile = .empty
    var showOnboarding = false

    // Calendar
    var calendarSlots: [CalendarSlot] = []

    // Discover
    enum LoadState: Equatable {
        case idle, loading, loaded, empty
        case error(String)
    }
    var discoverState: LoadState = .idle
    var events: [DiscoverEvent] = []
    var selectedEventID: String?
    var mapCenter = DemoData.defaultCenter
    var discoverSource: String?
    var filterStatsSummary: String?
    var usingDemoData = false

    // Planning
    var planState: LoadState = .idle
    var planResult: PlanResult?
    var planningEventID: String?

    var selectedEvent: DiscoverEvent? {
        guard let id = selectedEventID else { return nil }
        return events.first { $0.id == id }
    }

    var isMockAuth: Bool { auth.isMockAuth }
    var isAuthLoading: Bool { auth.isLoading }
    var isSignedIn: Bool { auth.isSignedIn }

    init(auth: AuthService = AuthService()) {
        self.auth = auth
    }

    // MARK: - Lifecycle

    func bootstrap() async {
        guard let uid = auth.currentUser?.uid else { return }
        if let loaded = await profiles.load(uid: uid) {
            profile = loaded
        }
        showOnboarding = !profile.onboardingComplete
        await loadCalendar()
        if profile.onboardingComplete {
            await refreshDiscover()
        }
    }

    func signIn() async {
        do {
            try await auth.signIn()
            await bootstrap()
        } catch {
            discoverState = .error(error.localizedDescription)
        }
    }

    func signOut() {
        auth.signOut()
        profile = .empty
        events = []
        planResult = nil
        selectedEventID = nil
        discoverState = .idle
        planState = .idle
    }

    // MARK: - Profile

    func saveProfile(_ updated: UserProfile) async {
        var next = updated
        next.onboardingComplete = true
        profile = next
        showOnboarding = false
        if let uid = auth.currentUser?.uid {
            await profiles.save(next, uid: uid)
        }
        await refreshDiscover()
    }

    func editPreferences() {
        showOnboarding = true
    }

    // MARK: - Calendar

    private func loadCalendar() async {
        if auth.isMockAuth {
            calendarSlots = CalendarService.mockWeekendFreeSlots()
        } else {
            calendarSlots = await calendar.freeWeekendSlots()
        }
    }

    // MARK: - Discover

    func refreshDiscover() async {
        let city = profile.homeCity.trimmingCharacters(in: .whitespaces)
        guard profile.onboardingComplete, !city.isEmpty else { return }
        discoverState = .loading

        if auth.isMockAuth {
            // Small delay so the loading UI is visible in demo mode.
            try? await Task.sleep(for: .milliseconds(650))
            apply(DemoData.response(location: city), demo: true)
            return
        }

        let query = DiscoverQuery(
            location: city,
            budget: profile.budget,
            diet: profile.diet,
            activities: profile.activities,
            accessibility: profile.accessibility,
            calendarSlots: calendarSlots
        )
        do {
            let response = try await api.discover(query)
            apply(response, demo: false)
        } catch {
            // Never leave the user with an empty screen — fall back to demo data.
            apply(DemoData.response(location: city), demo: true, note: error.localizedDescription)
        }
    }

    private func apply(_ response: DiscoverResponse, demo: Bool, note: String? = nil) {
        events = response.events
        usingDemoData = demo
        discoverSource = demo ? "sample" : (response.source ?? "tavily")
        if let lat = response.centerLat, let lng = response.centerLng {
            mapCenter = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        } else {
            mapCenter = DemoData.center(for: response.location)
        }
        if let stats = response.filterStats {
            filterStatsSummary = "\(stats.candidatesOut) of \(stats.candidatesIn) verified"
        } else {
            filterStatsSummary = nil
        }
        discoverState = events.isEmpty ? .empty : .loaded
        if let note { print("[discover fallback] \(note)") }
    }

    // MARK: - Selection

    func select(_ id: String?) {
        selectedEventID = id
    }

    // MARK: - Planning

    func plan(for event: DiscoverEvent) async {
        planningEventID = event.id
        planState = .loading
        planResult = nil

        if auth.isMockAuth {
            try? await Task.sleep(for: .milliseconds(900))
            planResult = DemoData.plan(for: event, profile: profile)
            planState = .loaded
            planningEventID = nil
            return
        }

        let activities = [
            profile.activities,
            "Focus event: \(event.title) (\(event.category))",
            String(event.description.prefix(200)),
        ].filter { !$0.isEmpty }.joined(separator: ". ")

        let request = PlanRequest(
            location: profile.homeCity,
            budget: max(profile.budget ?? 100, 1),
            diet: profile.diet.isEmpty ? "any" : profile.diet,
            activities: activities.isEmpty ? "weekend events" : activities,
            accessibility: profile.accessibility,
            calendarSlots: calendarSlots
        )
        do {
            planResult = try await api.plan(request)
            planState = .loaded
        } catch {
            planState = .error(error.localizedDescription)
        }
        planningEventID = nil
    }

    func dismissPlan() {
        planResult = nil
        planState = .idle
    }
}
