import Foundation

/// Client-side discover query, serialized into `GET /discover` query items.
struct DiscoverQuery: Sendable {
    var location: String
    var budget: Double?
    var diet: String
    var activities: String
    var accessibility: String?
    var calendarSlots: [CalendarSlot]
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case http(status: Int, message: String?)
    case decoding(String)
    case encoding(String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL: "Could not build the request URL."
        case .invalidResponse: "The server returned an unexpected response."
        case let .http(status, message): message ?? "Request failed (HTTP \(status))."
        case let .decoding(detail): "Could not read the response. \(detail)"
        case let .encoding(detail): "Could not encode the request. \(detail)"
        case .unauthorized: "Please sign in again to continue."
        }
    }
}

/// Async HTTP client for the FastAPI backend (`/discover`, `/plan`, `/health`).
actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    /// Returns a Firebase ID token, or nil when unavailable (demo mode).
    private let tokenProvider: (@Sendable (_ forceRefresh: Bool) async throws -> String?)?

    init(
        baseURL: URL = AppConfig.backendURL,
        session: URLSession = .shared,
        tokenProvider: (@Sendable (_ forceRefresh: Bool) async throws -> String?)? = nil
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenProvider = tokenProvider
    }

    // MARK: - Public API

    func discover(_ query: DiscoverQuery) async throws -> DiscoverResponse {
        let url = try Self.discoverURL(base: baseURL, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await send(request)
    }

    func plan(_ body: PlanRequest) async throws -> PlanResult {
        let url = baseURL.appendingPathComponent("plan")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            request.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw APIError.encoding(error.localizedDescription)
        }
        return try await send(request)
    }

    func health() async -> Bool {
        let url = baseURL.appendingPathComponent("health")
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        guard
            let (_, response) = try? await session.data(for: request),
            let http = response as? HTTPURLResponse
        else { return false }
        return (200..<300).contains(http.statusCode)
    }

    // MARK: - Request plumbing

    private func send<T: Decodable>(_ original: URLRequest) async throws -> T {
        var request = original
        try await applyAuth(to: &request, forceRefresh: false)

        var (data, response) = try await session.data(for: request)
        var http = response as? HTTPURLResponse

        // One retry on 401 with a freshly-minted token.
        if http?.statusCode == 401, tokenProvider != nil {
            var retry = original
            try await applyAuth(to: &retry, forceRefresh: true)
            (data, response) = try await session.data(for: retry)
            http = response as? HTTPURLResponse
        }

        guard let http else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.http(status: http.statusCode, message: Self.errorMessage(from: data))
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    private func applyAuth(to request: inout URLRequest, forceRefresh: Bool) async throws {
        guard let tokenProvider else { return }
        if let token = try await tokenProvider(forceRefresh), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    // MARK: - URL building (pure; unit-tested)

    static func discoverURL(base: URL, query: DiscoverQuery) throws -> URL {
        guard var components = URLComponents(
            url: base.appendingPathComponent("discover"),
            resolvingAgainstBaseURL: false
        ) else { throw APIError.invalidURL }

        var items: [URLQueryItem] = [URLQueryItem(name: "location", value: query.location)]

        if let budget = query.budget, budget > 0 {
            items.append(URLQueryItem(name: "budget", value: Self.trimNumber(budget)))
        }
        let diet = query.diet.trimmingCharacters(in: .whitespacesAndNewlines)
        if !diet.isEmpty { items.append(URLQueryItem(name: "diet", value: diet)) }

        let activities = query.activities.trimmingCharacters(in: .whitespacesAndNewlines)
        if !activities.isEmpty { items.append(URLQueryItem(name: "activities", value: activities)) }

        if let access = query.accessibility?.trimmingCharacters(in: .whitespacesAndNewlines), !access.isEmpty {
            items.append(URLQueryItem(name: "accessibility", value: access))
        }

        if !query.calendarSlots.isEmpty,
           let json = try? JSONEncoder().encode(query.calendarSlots),
           let str = String(data: json, encoding: .utf8) {
            items.append(URLQueryItem(name: "calendar_slots", value: str))
        }

        components.queryItems = items
        guard let url = components.url else { throw APIError.invalidURL }
        return url
    }

    private static func trimNumber(_ value: Double) -> String {
        if value == value.rounded() { return String(Int(value)) }
        return String(value)
    }

    private static func errorMessage(from data: Data) -> String? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return (obj["detail"] as? String) ?? (obj["message"] as? String) ?? (obj["error"] as? String)
    }
}
