import Foundation
import Observation

#if canImport(UIKit)
import UIKit
#endif

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@Observable
@MainActor
final class AuthService {
  private(set) var user: AuthUser?
  private(set) var isLoading = true

  var isMockAuth: Bool {
    !AppConfig.isFirebaseConfigured
  }

  private let mockUserDefaultsKey = "sidequest-mock-user"
  private var authStateHandle: Any?

  init() {
    restoreSession()
  }

  deinit {
    #if canImport(FirebaseAuth)
    if let handle = authStateHandle as? AuthStateDidChangeListenerHandle {
      Auth.auth().removeStateDidChangeListener(handle)
    }
    #endif
  }

  func signInWithGoogle() async throws {
    if isMockAuth {
      let mockUser = AuthUser(
        uid: "mock-\(Int(Date().timeIntervalSince1970 * 1000))",
        displayName: "Demo Explorer",
        email: "demo@weekend.local",
        photoURL: nil
      )
      persistMockUser(mockUser)
      user = mockUser
      return
    }

    #if canImport(FirebaseAuth) && canImport(GoogleSignIn)
    guard let clientID = Self.firebaseClientID() else {
      throw AuthServiceError.firebaseNotConfigured
    }

    let configuration = GIDConfiguration(clientID: clientID)
    GIDSignIn.sharedInstance.configuration = configuration

    guard let presentingViewController = Self.topViewController() else {
      throw AuthServiceError.missingPresentationContext
    }

    let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController)
    guard let idToken = result.user.idToken?.tokenString else {
      throw AuthServiceError.missingIDToken
    }

    let credential = GoogleAuthProvider.credential(
      withIDToken: idToken,
      accessToken: result.user.accessToken.tokenString
    )

    let authResult = try await Auth.auth().signIn(with: credential)
    user = Self.mapFirebaseUser(authResult.user)
    #else
    throw AuthServiceError.firebaseNotConfigured
    #endif
  }

  func signOut() async throws {
    if AppConfig.isFirebaseConfigured {
      #if canImport(FirebaseAuth)
      try Auth.auth().signOut()
      #endif
      #if canImport(GoogleSignIn)
      GIDSignIn.sharedInstance.signOut()
      #endif
    }

    UserDefaults.standard.removeObject(forKey: mockUserDefaultsKey)
    user = nil
  }

  // MARK: - Private

  private func restoreSession() {
    if isMockAuth {
      user = readMockUser()
      isLoading = false
      return
    }

    #if canImport(FirebaseAuth)
    authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
      Task { @MainActor in
        guard let self else { return }
        self.user = firebaseUser.map(Self.mapFirebaseUser)
        self.isLoading = false
      }
    }
    #else
    isLoading = false
    #endif
  }

  private func readMockUser() -> AuthUser? {
    guard let data = UserDefaults.standard.data(forKey: mockUserDefaultsKey) else {
      return nil
    }
    return try? JSONDecoder().decode(AuthUser.self, from: data)
  }

  private func persistMockUser(_ user: AuthUser) {
    guard let data = try? JSONEncoder().encode(user) else { return }
    UserDefaults.standard.set(data, forKey: mockUserDefaultsKey)
  }

  #if canImport(FirebaseAuth)
  private static func mapFirebaseUser(_ user: User) -> AuthUser {
    AuthUser(
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL?.absoluteString
    )
  }
  #endif

  private static func firebaseClientID() -> String? {
    guard
      let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let plist = NSDictionary(contentsOfFile: path),
      let clientID = plist["CLIENT_ID"] as? String,
      !clientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
      clientID.uppercased() != "PLACEHOLDER"
    else {
      return nil
    }
    return clientID
  }

  #if canImport(UIKit)
  private static func topViewController(
    base: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?.rootViewController
  ) -> UIViewController? {
    if let nav = base as? UINavigationController {
      return topViewController(base: nav.visibleViewController)
    }
    if let tab = base as? UITabBarController, let selected = tab.selectedViewController {
      return topViewController(base: selected)
    }
    if let presented = base?.presentedViewController {
      return topViewController(base: presented)
    }
    return base
  }
  #endif
}

enum AuthServiceError: LocalizedError {
  case firebaseNotConfigured
  case missingPresentationContext
  case missingIDToken

  var errorDescription: String? {
    switch self {
    case .firebaseNotConfigured:
      return "Firebase is not configured for this build."
    case .missingPresentationContext:
      return "Unable to present Google sign-in."
    case .missingIDToken:
      return "Google sign-in did not return an ID token."
    }
  }
}
