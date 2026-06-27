import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlanRequest, PlanResult } from "../types";

vi.mock("../auth-policy", () => ({
  isMockAuthAllowed: vi.fn(() => true),
}));

vi.mock("../api-auth", () => ({
  fetchWithAuth: (...args: Parameters<typeof fetch>) => fetch(...args),
  requireAuthenticatedUser: vi.fn(),
}));

import { planWeekend } from "../mppx-client";

const planRequest: PlanRequest = {
  location: "Austin, TX",
  budget: 150,
  diet: "vegan",
  activities: "music",
};

const planResult: PlanResult = {
  itinerary: [
    {
      time: "10:00",
      activity: "Brunch",
      venue: "Green Cafe",
      cost: "$20",
      diet_access: "vegan",
      source_url: "https://example.com",
      source_index: 0,
    },
  ],
  cited_path: "/plans/1",
  filter_stats: {
    candidates_in: 5,
    candidates_out: 2,
    filter_method: "sdk",
    concept_name: "weekend_plan",
  },
};

describe("planWeekend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /api/plan via fetchWithAuth and returns PlanResult", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => planResult,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onStatus = vi.fn();
    const result = await planWeekend(planRequest, onStatus);

    expect(onStatus).toHaveBeenCalledWith("planning");
    expect(fetchMock).toHaveBeenCalledWith("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planRequest),
    });
    expect(result).toEqual(planResult);
  });

  it("throws with error detail from failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Invalid budget" }),
      }),
    );

    await expect(planWeekend(planRequest)).rejects.toThrow("Invalid budget");
  });
});
