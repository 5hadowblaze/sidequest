import Foundation
import FirebaseFirestore

/// Persists the user profile.
///
/// - **Live mode**: Firestore `users/{uid}` (field `onboardingCompleted`,
///   matching the web app's schema).
/// - **Demo mode**: `UserDefaults`, keyed per uid.
@MainActor
final class ProfileService {
    private let isMock = !AppConfig.isFirebaseConfigured

    private func defaultsKey(_ uid: String) -> String { "sidequest.profile.\(uid)" }

    func load(uid: String) async -> UserProfile? {
        if isMock {
            guard let data = UserDefaults.standard.data(forKey: defaultsKey(uid)) else { return nil }
            return try? JSONDecoder().decode(UserProfile.self, from: data)
        }

        do {
            let snapshot = try await Firestore.firestore()
                .collection("users").document(uid).getDocument()
            guard let data = snapshot.data() else { return nil }
            return Self.profile(from: data)
        } catch {
            return nil
        }
    }

    func save(_ profile: UserProfile, uid: String) async {
        var stored = profile
        stored.updatedAt = Date()

        if isMock {
            if let data = try? JSONEncoder().encode(stored) {
                UserDefaults.standard.set(data, forKey: defaultsKey(uid))
            }
            return
        }

        var payload: [String: Any] = [
            "homeCity": stored.homeCity,
            "diet": stored.diet,
            "activities": stored.activities,
            "onboardingCompleted": stored.onboardingComplete,
            "updatedAt": FieldValue.serverTimestamp(),
        ]
        if let budget = stored.budget { payload["budget"] = budget }
        if let access = stored.accessibility, !access.isEmpty { payload["accessibility"] = access }

        try? await Firestore.firestore()
            .collection("users").document(uid)
            .setData(payload, merge: true)
    }

    private static func profile(from data: [String: Any]) -> UserProfile {
        let budget: Double?
        if let n = data["budget"] as? Double { budget = n }
        else if let n = data["budget"] as? Int { budget = Double(n) }
        else { budget = nil }

        let updatedAt: Date?
        if let ts = data["updatedAt"] as? Timestamp { updatedAt = ts.dateValue() }
        else { updatedAt = nil }

        return UserProfile(
            homeCity: data["homeCity"] as? String ?? "",
            budget: budget,
            diet: data["diet"] as? String ?? "",
            activities: data["activities"] as? String ?? "",
            accessibility: data["accessibility"] as? String,
            onboardingComplete: data["onboardingCompleted"] as? Bool ?? false,
            updatedAt: updatedAt
        )
    }
}
