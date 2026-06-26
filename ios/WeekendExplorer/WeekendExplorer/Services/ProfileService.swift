import Foundation

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

actor ProfileService {
  private let localPrefix = "sidequest-profile:"
  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  func loadProfile(userID: String) async throws -> UserProfile? {
    if AppConfig.isFirebaseConfigured {
      #if canImport(FirebaseFirestore)
      return try await loadFromFirestore(userID: userID)
      #else
      return loadFromDefaults(userID: userID)
      #endif
    }
    return loadFromDefaults(userID: userID)
  }

  func saveProfile(userID: String, profile: UserProfile) async throws {
    if AppConfig.isFirebaseConfigured {
      #if canImport(FirebaseFirestore)
      try await saveToFirestore(userID: userID, profile: profile)
      return
      #endif
    }
    saveToDefaults(userID: userID, profile: profile)
  }

  func hasCompletedOnboarding(userID: String) async throws -> Bool {
    let profile = try await loadProfile(userID: userID)
    return profile?.onboardingComplete == true
  }

  // MARK: - Firestore

  #if canImport(FirebaseFirestore)
  private func loadFromFirestore(userID: String) async throws -> UserProfile? {
    let snapshot = try await Firestore.firestore()
      .collection("users")
      .document(userID)
      .getDocument()

    guard snapshot.exists, let data = snapshot.data() else {
      return nil
    }

    return mapFirestoreProfile(data)
  }

  private func saveToFirestore(userID: String, profile: UserProfile) async throws {
    let docRef = Firestore.firestore().collection("users").document(userID)
    let existing = try await docRef.getDocument()

    var payload: [String: Any] = [
      "uid": userID,
      "homeCity": profile.homeCity.trimmingCharacters(in: .whitespacesAndNewlines),
      "budget": profile.budget,
      "diet": profile.diet.trimmingCharacters(in: .whitespacesAndNewlines),
      "activities": profile.activities.trimmingCharacters(in: .whitespacesAndNewlines),
      "onboardingCompleted": profile.onboardingComplete,
      "updatedAt": FieldValue.serverTimestamp(),
    ]

    if let accessibility = profile.accessibility?.trimmingCharacters(in: .whitespacesAndNewlines),
       !accessibility.isEmpty
    {
      payload["accessibility"] = accessibility
    }

    if !existing.exists {
      payload["createdAt"] = FieldValue.serverTimestamp()
    }

    try await docRef.setData(payload, merge: true)
  }

  private func mapFirestoreProfile(_ data: [String: Any]) -> UserProfile? {
    guard
      let homeCity = data["homeCity"] as? String,
      let budget = data["budget"] as? Double ?? (data["budget"] as? NSNumber)?.doubleValue,
      let diet = data["diet"] as? String,
      let activities = data["activities"] as? String
    else {
      return nil
    }

    let onboardingComplete = data["onboardingCompleted"] as? Bool ?? false
    let accessibility = data["accessibility"] as? String

    let updatedAt: String
    if let timestamp = data["updatedAt"] as? Timestamp {
      updatedAt = ISO8601DateFormatter().string(from: timestamp.dateValue())
    } else {
      updatedAt = ISO8601DateFormatter().string(from: Date())
    }

    return UserProfile(
      homeCity: homeCity,
      budget: budget,
      diet: diet,
      activities: activities,
      accessibility: accessibility,
      onboardingComplete: onboardingComplete,
      updatedAt: updatedAt
    )
  }
  #endif

  // MARK: - UserDefaults fallback

  private func defaultsKey(for userID: String) -> String {
    "\(localPrefix)\(userID)"
  }

  private func loadFromDefaults(userID: String) -> UserProfile? {
    guard let data = defaults.data(forKey: defaultsKey(for: userID)) else {
      return nil
    }
    return try? JSONDecoder().decode(UserProfile.self, from: data)
  }

  private func saveToDefaults(userID: String, profile: UserProfile) {
    guard let data = try? JSONEncoder().encode(profile) else { return }
    defaults.set(data, forKey: defaultsKey(for: userID))
  }
}

extension ProfileService {
  static func makeDefaultProfile(
    homeCity: String,
    budget: Double,
    diet: String,
    activities: String,
    accessibility: String? = nil
  ) -> UserProfile {
    UserProfile(
      homeCity: homeCity,
      budget: budget,
      diet: diet,
      activities: activities,
      accessibility: accessibility,
      onboardingComplete: true,
      updatedAt: ISO8601DateFormatter().string(from: Date())
    )
  }
}
