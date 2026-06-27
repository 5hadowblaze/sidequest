import { describe, expect, it } from "vitest";

import {
  buildDiscoverFilterSecondary,
  buildDiscoverStatsCopy,
  formatDiscoverNumber,
  getDiscoverCityTotal,
  resolveDiscoverCityKey,
} from "@/lib/discover-stats";
import type { FilterStats } from "@/lib/types";

describe("discover-stats", () => {
  it("formats numbers with commas", () => {
    expect(formatDiscoverNumber(1532)).toBe("1,532");
    expect(formatDiscoverNumber(42)).toBe("42");
  });

  it("resolves city keys from chip labels and variants", () => {
    expect(resolveDiscoverCityKey("London")).toBe("London");
    expect(resolveDiscoverCityKey("Austin, TX")).toBe("Austin");
    expect(resolveDiscoverCityKey("nyc")).toBe("NYC");
  });

  it("returns seeded totals per city", () => {
    expect(getDiscoverCityTotal("London")).toBe(1532);
    expect(getDiscoverCityTotal("NYC")).toBe(2100);
    expect(getDiscoverCityTotal("Austin, TX")).toBe(890);
    expect(getDiscoverCityTotal("Portland, OR")).toBe(1100);
  });

  it("builds completed discover copy for London", () => {
    expect(
      buildDiscoverStatsCopy({
        homeCity: "London",
        chosenCount: 42,
      }),
    ).toBe(
      "Out of 1,532 events happening in London this month, we've chosen 42 that are interesting for you",
    );
  });

  it("uses live event count as chosen", () => {
    expect(
      buildDiscoverStatsCopy({
        homeCity: "NYC",
        chosenCount: 12,
      }),
    ).toContain("we've chosen 12");
    expect(
      buildDiscoverStatsCopy({
        homeCity: "NYC",
        chosenCount: 12,
      }),
    ).toContain("2,100");
  });

  it("builds loading copy", () => {
    expect(
      buildDiscoverStatsCopy({
        homeCity: "London",
        chosenCount: null,
        loading: true,
      }),
    ).toContain("we're choosing the ones you'll love");
  });

  it("builds filter secondary line from filter_stats", () => {
    const stats: FilterStats = {
      candidates_in: 2400,
      candidates_out: 42,
      filter_method: "sdk",
      concept_name: "event_filter",
    };
    expect(buildDiscoverFilterSecondary(stats)).toBe(
      "Filtered from 2,400 candidates · 42 passed your profile",
    );
  });
});
