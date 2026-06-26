import Foundation

// MARK: - Errors

enum APIClientError: LocalizedError, Equatable {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case decodingFailed(String)
    case encodingFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid request URL."
        case .invalidResponse:
            return "The server returned an unexpected response."
        case let .httpError(statusCode, message):
            return message.isEmpty ? "Request failed (\(statusCode))." : message
        case let .decodingFailed(message):
            return "Failed to decode server response: \(message)"
        case let .encodingFailed(message):
            return "Failed to encode request: \(message)"
        }
    }
}

// MARK: - Client

struct APIClient: Sendable {
    private let baseURL: URL
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(
        baseURL: URL = AppConfig.backendURL,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
    }

    func discoverURL(for query: DiscoverQuery) throws -> URL {
        guard var components = URLComponents(
            url: baseURL.appendingPathComponent("discover"),
            resolvingAgainstBaseURL: false
        ) else {
            throw APIClientError.invalidURL
        }

        components.queryItems = try discoverQueryItems(for: query)

        guard let url = components.url else {
            throw APIClientError.invalidURL
        }

        return url
    }

    func discover(query: DiscoverQuery) async throws -> DiscoverResponse {
        let url = try discoverURL(for: query)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        return try await perform(request)
    }

    func plan(_ planRequest: PlanRequest) async throws -> PlanResult {
        let url = baseURL.appendingPathComponent("plan")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            request.httpBody = try encoder.encode(planRequest)
        } catch {
            throw APIClientError.encodingFailed(error.localizedDescription)
        }

        return try await perform(request)
    }

    // MARK: - Private

    private func discoverQueryItems(for query: DiscoverQuery) throws -> [URLQueryItem] {
        var items = [URLQueryItem(name: "location", value: query.location)]

        if let budget = query.budget {
            items.append(URLQueryItem(name: "budget", value: String(budget)))
        }
        if let diet = query.diet {
            items.append(URLQueryItem(name: "diet", value: diet))
        }
        if let activities = query.activities {
            items.append(URLQueryItem(name: "activities", value: activities))
        }
        if let accessibility = query.accessibility?.trimmingCharacters(in: .whitespacesAndNewlines),
           !accessibility.isEmpty
        {
            items.append(URLQueryItem(name: "accessibility", value: accessibility))
        }
        if !query.calendarSlots.isEmpty {
            let slotsData = try encoder.encode(query.calendarSlots)
            let slotsJSON = String(decoding: slotsData, as: UTF8.self)
            items.append(URLQueryItem(name: "calendar_slots", value: slotsJSON))
        }

        return items
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw error
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        if !(200 ... 299).contains(http.statusCode) {
            let message = Self.extractErrorMessage(from: data)
                ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            throw APIClientError.httpError(statusCode: http.statusCode, message: message)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIClientError.decodingFailed(error.localizedDescription)
        }
    }

    private static func extractErrorMessage(from data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        if let detail = object["detail"] as? String, !detail.isEmpty {
            return detail
        }
        if let message = object["message"] as? String, !message.isEmpty {
            return message
        }
        if let error = object["error"] as? String, !error.isEmpty {
            return error
        }
        return nil
    }
}
