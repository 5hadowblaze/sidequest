import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth-policy", () => ({
  isMockAuthAllowed: vi.fn(() => true),
}));

vi.mock("../api-auth", () => ({
  fetchWithAuth: (...args: Parameters<typeof fetch>) => fetch(...args),
  requireAuthenticatedUser: vi.fn(),
}));

import {
  discoverQueryFromProfile,
  DiscoverError,
  fetchDiscoverEvents,
} from "../discover-client";
import type { DiscoverResponse, UserProfile } from "../types";

const profile: UserProfile = {
  homeCity: "Austin, TX",
  budget: 150,
  diet: "vegan",
  activities: "Live music",
  accessibility: "wheelchair",
  onboardingComplete: true,
  updatedAt: "2026-06-26T12:00:00.000Z",
};

describe("discoverQueryFromProfile", () => {
  it("builds DiscoverParams from profile and calendar slots", () => {
    const slots = [{ date: "2026-06-28", period: "evening" as const }];
    const params = discoverQueryFromProfile(profile, slots);

    expect(params).toEqual({
      location: "Austin, TX",
      profile,
      calendarSlots: slots,
    });
  });
});

describe("fetchDiscoverEvents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /api/discover with profile and calendar query params", async () => {
    const mockResponse: DiscoverResponse = {
      location: "Austin, TX",
      events: [],
      source: "mock",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDiscoverEvents({
      location: "Austin, TX",
      profile,
      calendarSlots: [{ date: "2026-06-28", period: "morning" }],
    });

    expect(result).toEqual(mockResponse);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/discover?");
    expect(calledUrl).toContain("location=Austin%2C+TX");
    expect(calledUrl).toContain("budget=150");
    expect(calledUrl).toContain("diet=vegan");
    expect(calledUrl).toContain("activities=Live+music");
    expect(calledUrl).toContain("accessibility=wheelchair");
    expect(calledUrl).toContain("calendar_slots=");
  });

  it("throws with backend detail on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        json: async () => ({ detail: "Backend unavailable" }),
      }),
    );

    await expect(
      fetchDiscoverEvents({ location: "Austin, TX" }),
    ).rejects.toThrow("Backend unavailable");
  });

  it("throws DiscoverError with retry-after on 503 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "Retry-After": "30" }),
        json: async () => ({ detail: "Prometheux engine busy" }),
      }),
    );

    await expect(
      fetchDiscoverEvents({ location: "Austin, TX" }),
    ).rejects.toMatchObject({
      message: "Prometheux engine busy",
      status: 503,
      retryAfterSeconds: 30,
    });
    await expect(
      fetchDiscoverEvents({ location: "Austin, TX" }),
    ).rejects.toBeInstanceOf(DiscoverError);
  });

  it("throws fallback message when response has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({}),
      }),
    );

    await expect(
      fetchDiscoverEvents({ location: "Austin, TX" }),
    ).rejects.toThrow("Discover failed (500)");
  });
});
