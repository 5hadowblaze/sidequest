import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "../types";

vi.mock("../firebase", () => ({
  isFirebaseConfigured: vi.fn(() => false),
}));

vi.mock("../firestore", () => ({
  loadUserProfile: vi.fn(),
  saveUserProfile: vi.fn(),
}));

import { isFirebaseConfigured } from "../firebase";
import { loadUserProfile, saveUserProfile } from "../firestore";
import { createDefaultProfile, getProfileStore } from "../profile";

const sampleProfile: UserProfile = {
  homeCity: "Austin, TX",
  budget: 200,
  diet: "vegan",
  activities: "Live music, Outdoors",
  onboardingComplete: true,
  updatedAt: "2026-06-26T12:00:00.000Z",
};

describe("createDefaultProfile", () => {
  it("merges partial fields and sets onboardingComplete", () => {
    const profile = createDefaultProfile({
      homeCity: "Portland, OR",
      budget: 100,
      diet: "vegetarian",
      activities: "Markets",
    });

    expect(profile.homeCity).toBe("Portland, OR");
    expect(profile.onboardingComplete).toBe(true);
    expect(profile.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes optional accessibility", () => {
    const profile = createDefaultProfile({
      homeCity: "Seattle, WA",
      budget: 80,
      diet: "none",
      activities: "Art",
      accessibility: "wheelchair",
    });

    expect(profile.accessibility).toBe("wheelchair");
  });
});

describe("getProfileStore (localStorage)", () => {
  beforeEach(() => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false);
    localStorage.clear();
  });

  it("returns null when no profile is stored", async () => {
    const store = getProfileStore();
    await expect(store.getProfile("user-1")).resolves.toBeNull();
  });

  it("saves and loads a profile from localStorage", async () => {
    const store = getProfileStore();
    await store.saveProfile("user-1", sampleProfile);

    const loaded = await store.getProfile("user-1");
    expect(loaded).toEqual(sampleProfile);
    expect(localStorage.getItem("sidequest-profile:user-1")).toBeTruthy();
  });

  it("returns null for corrupted localStorage JSON", async () => {
    localStorage.setItem("sidequest-profile:user-1", "{not-json");
    const store = getProfileStore();
    await expect(store.getProfile("user-1")).resolves.toBeNull();
  });
});

describe("getProfileStore (Firestore)", () => {
  beforeEach(() => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(true);
    vi.mocked(loadUserProfile).mockReset();
    vi.mocked(saveUserProfile).mockReset();
  });

  it("loads profile from Firestore and maps fields", async () => {
    vi.mocked(loadUserProfile).mockResolvedValue({
      uid: "user-2",
      homeCity: "Denver, CO",
      budget: 120,
      diet: "gluten-free",
      activities: "Hiking",
      onboardingCompleted: true,
      updatedAt: { toDate: () => new Date("2026-06-01T00:00:00Z") },
    } as never);

    const store = getProfileStore();
    const profile = await store.getProfile("user-2");

    expect(loadUserProfile).toHaveBeenCalledWith("user-2");
    expect(profile).toMatchObject({
      homeCity: "Denver, CO",
      budget: 120,
      onboardingComplete: true,
    });
    expect(profile?.updatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns null when Firestore has no profile", async () => {
    vi.mocked(loadUserProfile).mockResolvedValue(null);
    const store = getProfileStore();
    await expect(store.getProfile("missing")).resolves.toBeNull();
  });

  it("saves profile to Firestore with mapped input", async () => {
    vi.mocked(saveUserProfile).mockResolvedValue(undefined);

    const store = getProfileStore();
    await store.saveProfile("user-3", sampleProfile);

    expect(saveUserProfile).toHaveBeenCalledWith(
      "user-3",
      {
        homeCity: sampleProfile.homeCity,
        budget: sampleProfile.budget,
        diet: sampleProfile.diet,
        activities: sampleProfile.activities,
        accessibility: sampleProfile.accessibility,
      },
      { onboardingCompleted: true },
    );
  });
});
