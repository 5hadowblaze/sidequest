import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  clearPlanConfirmation,
  getPlanClientId,
  loadPlanConfirmation,
  planStorageKey,
  savePlanConfirmation,
} from "../plan-confirmation";
import type { PlanResult } from "../types";

const samplePlan = (): PlanResult => ({
  itinerary: [
    {
      time: "10:00",
      activity: "Brunch",
      venue: "Cafe",
      cost: "$20",
      diet_access: "vegan",
      source_url: "https://example.com",
      source_index: 0,
    },
  ],
  cited_path: "/path",
  trace_id: "trace-abc",
  filter_stats: {
    candidates_in: 5,
    candidates_out: 2,
    filter_method: "demo",
    concept_name: "weekend_plan",
  },
});

describe("plan-confirmation storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("builds storage keys from user and plan id", () => {
    expect(planStorageKey("user-1", "trace-abc")).toBe(
      "sidequest-plan-confirmed:user-1:trace-abc",
    );
  });

  it("prefers trace_id for client plan id", () => {
    expect(getPlanClientId(samplePlan())).toBe("trace-abc");
    expect(getPlanClientId({ ...samplePlan(), trace_id: null, client_id: "local-1" })).toBe(
      "local-1",
    );
  });

  it("saves and loads confirmed draft", () => {
    const plan = samplePlan();
    savePlanConfirmation("user-1", "trace-abc", plan);
    const stored = loadPlanConfirmation("user-1", "trace-abc");
    expect(stored?.confirmed).toBe(true);
    expect(stored?.draft.itinerary[0].venue).toBe("Cafe");
    expect(stored?.confirmedAt).toBeTruthy();
  });

  it("clears stored confirmation", () => {
    savePlanConfirmation("user-1", "trace-abc", samplePlan());
    clearPlanConfirmation("user-1", "trace-abc");
    expect(loadPlanConfirmation("user-1", "trace-abc")).toBeNull();
  });
});
