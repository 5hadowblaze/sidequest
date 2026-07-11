import Foundation
import Observation
#if canImport(UIKit)
import UIKit
#endif
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

/// Authentication service.
///
/// - **Live mode** (real `GoogleService-Info.plist`): Google Sign-In → Firebase.
/// - **Demo mode** (placeholder plist): a local mock user persisted in
///   `UserDefaults`, so the app is fully usable without Firebase secrets.
@MainActor
@Observable
final class AuthService {
    private(set) var currentUser: AuthUser?
    private(set) var isLoading: Bool = true

    var isSignedIn: Bool { currentUser != nil }
    let isMockAuth: Bool = !AppConfig.isFirebaseConfigured

    private let mockUserKey = "sidequest.mockUser"

    init() {
        if AppConfig.isUITesting {
            UserDefaults.standard.removeObject(forKey: mockUserKey)
        }
        restore()
    }

    // MARK: - Session restore

    private func restore() {
        if isMockAuth {
            if let data = UserDefaults.standard.data(forKey: mockUserKey),
               let user = try? JSONDecoder().decode(StoredMockUser.self, from: data) {
                currentUser = user.asAuthUser
            }
            isLoading = false
            return
        }

        if let user = Auth.auth().currentUser {
            currentUser = Self.map(user)
        }
        isLoading = false
    }

    // MARK: - Sign in / out

    func signIn() async throws {
        if isMockAuth {
            let mock = StoredMockUser(
                uid: "demo-\(UUID().uuidString.prefix(8))",
                displayName: "Demo Explorer",
                email: "demo@sidequest.app",
                photoURL: nil
            )
            UserDefaults.standard.set(try JSONEncoder().encode(mock), forKey: mockUserKey)
            currentUser = mock.asAuthUser
            return
        }

        try await signInWithGoogle()
    }

    func signOut() {
        if isMockAuth {
            UserDefaults.standard.removeObject(forKey: mockUserKey)
        } else {
            GIDSignIn.sharedInstance.signOut()
            try? Auth.auth().signOut()
        }
        currentUser = nil
    }

    // MARK: - Tokens

    /// Firebase ID token for API auth, or nil in demo mode.
    func idToken(forceRefresh: Bool = false) async throws -> String? {
        guard !isMockAuth, let user = Auth.auth().currentUser else { return nil }
        return try await user.getIDToken(forcingRefresh: forceRefresh)
    }

    // MARK: - Google Sign-In (live)

    private func signInWithGoogle() async throws {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            throw AuthError.missingClientID
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)

        #if canImport(UIKit)
        guard let presenter = Self.topViewController() else {
            throw AuthError.noPresenter
        }
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let idToken = result.user.idToken?.tokenString else {
            throw AuthError.missingGoogleToken
        }
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString
        )
        let authResult = try await Auth.auth().signIn(with: credential)
        currentUser = Self.map(authResult.user)
        #else
        throw AuthError.noPresenter
        #endif
    }

    // MARK: - Helpers

    private static func map(_ user: FirebaseAuth.User) -> AuthUser {
        AuthUser(
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL?.absoluteString
        )
    }

    #if canImport(UIKit)
    private static func topViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.first?.windows.first
        var top = window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
    #endif
}

enum AuthError: LocalizedError {
    case missingClientID
    case noPresenter
    case missingGoogleToken

    var errorDescription: String? {
        switch self {
        case .missingClientID: "Firebase client ID is missing. Check GoogleService-Info.plist."
        case .noPresenter: "Could not present the Google sign-in screen."
        case .missingGoogleToken: "Google did not return an ID token."
        }
    }
}

private struct StoredMockUser: Codable {
    let uid: String
    let displayName: String?
    let email: String?
    let photoURL: String?
    var asAuthUser: AuthUser {
        AuthUser(uid: uid, displayName: displayName, email: email, photoURL: photoURL)
    }
}
