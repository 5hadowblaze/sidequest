import Foundation

enum AppConfig {
  private static let defaultBackendURL = "http://127.0.0.1:8000"

  /// Backend base URL from Info.plist `BACKEND_URL`, falling back to local dev server.
  static var backendURL: URL {
    let raw = Bundle.main.object(forInfoDictionaryKey: "BACKEND_URL") as? String
    let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let urlString = trimmed.isEmpty ? defaultBackendURL : trimmed

    guard let url = URL(string: urlString) else {
      return URL(string: defaultBackendURL)!
    }
    return url
  }

  /// True when a real `GoogleService-Info.plist` CLIENT_ID is present (not the placeholder).
  static var isFirebaseConfigured: Bool {
    guard
      let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let plist = NSDictionary(contentsOfFile: path),
      let clientID = plist["CLIENT_ID"] as? String
    else {
      return false
    }

    let trimmed = clientID.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return false }
    return trimmed.uppercased() != "PLACEHOLDER"
  }
}
