import {
  loadUserProfile,
  saveUserProfile,
  type UserProfileInput,
} from "./firestore";
import { isFirebaseConfigured } from "./firebase";
import type { UserProfile } from "./types";

export interface ProfileStore {
  getProfile(userId: string): Promise<UserProfile | null>;
  saveProfile(userId: string, profile: UserProfile): Promise<void>;
}

const LOCAL_PREFIX = "sidequest-profile:";
const LEGACY_LOCAL_PREFIX = "weekend-explorer-profile:";

function fromFirestoreProfile(
  uid: string,
  data: Awaited<ReturnType<typeof loadUserProfile>>,
): UserProfile | null {
  if (!data) return null;
  return {
    homeCity: data.homeCity,
    budget: data.budget,
    diet: data.diet,
    activities: data.activities,
    accessibility: data.accessibility,
    onboardingComplete: data.onboardingCompleted,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

class LocalProfileStore implements ProfileStore {
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (typeof window === "undefined") return null;
    const key = `${LOCAL_PREFIX}${userId}`;
    let raw = localStorage.getItem(key);
    if (!raw) {
      const legacyKey = `${LEGACY_LOCAL_PREFIX}${userId}`;
      raw = localStorage.getItem(legacyKey);
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(legacyKey);
      }
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    if (typeof window === "undefined") return;
    const key = `${LOCAL_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(profile));
    localStorage.removeItem(`${LEGACY_LOCAL_PREFIX}${userId}`);
  }
}

class FirebaseProfileStore implements ProfileStore {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const data = await loadUserProfile(userId);
    return fromFirestoreProfile(userId, data);
  }

  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    const input: UserProfileInput = {
      homeCity: profile.homeCity,
      budget: profile.budget,
      diet: profile.diet,
      activities: profile.activities,
      accessibility: profile.accessibility,
    };
    await saveUserProfile(userId, input, {
      onboardingCompleted: profile.onboardingComplete,
    });
  }
}

const localStore = new LocalProfileStore();
const firebaseStore = new FirebaseProfileStore();

export function getProfileStore(): ProfileStore {
  return isFirebaseConfigured() ? firebaseStore : localStore;
}

export function createDefaultProfile(
  partial: Pick<UserProfile, "homeCity" | "budget" | "diet" | "activities"> &
    Partial<Pick<UserProfile, "accessibility">>,
): UserProfile {
  return {
    ...partial,
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };
}
