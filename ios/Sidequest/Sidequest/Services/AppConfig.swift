import Foundation

/// Runtime configuration derived from Info.plist / bundled resources.
enum AppConfig {
    /// Backend base URL (no trailing slash). Comes from `BACKEND_URL` in
    /// `Config.xcconfig` → Info.plist. Falls back to the production App Hosting
    /// proxy when unset.
    static var backendURL: URL {
        let raw = (Bundle.main.object(forInfoDictionaryKey: "BACKEND_URL") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let cleaned = raw.hasSuffix("/") ? String(raw.dropLast()) : raw
        if let url = URL(string: cleaned), !cleaned.isEmpty, url.scheme != nil {
            return url
        }
        return URL(string: "https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app/api")!
    }

    /// True when a real `GoogleService-Info.plist` is present (not the
    /// committed placeholder). Drives live-vs-demo mode.
    static var isFirebaseConfigured: Bool {
        guard
            let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
            let dict = NSDictionary(contentsOfFile: path),
            let clientID = dict["CLIENT_ID"] as? String
        else { return false }
        return clientID != "PLACEHOLDER" && !clientID.isEmpty
    }

    /// True when launched by the UI test runner.
    static var isUITesting: Bool {
        ProcessInfo.processInfo.arguments.contains("-uiTesting")
    }

    /// The origin used to resolve relative `image_url` values returned by the
    /// backend (e.g. `/images/events/x.jpg`).
    static var assetOrigin: URL {
        let base = backendURL
        // If backend is the App Hosting /api proxy, images live at the site root.
        if base.absoluteString.hasSuffix("/api") {
            return URL(string: String(base.absoluteString.dropLast(4)))!
        }
        return base
    }
}
