import { CITY_CHIPS } from "@/components/Onboarding/constants";
import type { FilterStats } from "@/lib/types";

/** Seeded monthly event totals per city for demo / editorial copy. */
export const DISCOVER_CITY_TOTALS: Record<string, number> = {
  London: 1532,
  NYC: 2100,
  Austin: 890,
  Berlin: 1240,
  Tokyo: 1680,
  Paris: 1450,
  Lisbon: 720,
  Chicago: 1180,
};

const DEFAULT_CITY_TOTAL = 1100;

export function formatDiscoverNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function resolveDiscoverCityKey(homeCity: string): string {
  const trimmed = homeCity.trim();
  if (!trimmed) return "London";

  const exactChip = CITY_CHIPS.find(
    (chip) => chip.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactChip) return exactChip.label;

  const base = trimmed.split(",")[0]?.trim() ?? trimmed;
  const baseChip = CITY_CHIPS.find(
    (chip) => chip.label.toLowerCase() === base.toLowerCase(),
  );
  if (baseChip) return baseChip.label;

  const prefixChip = CITY_CHIPS.find((chip) =>
    trimmed.toLowerCase().startsWith(chip.label.toLowerCase()),
  );
  if (prefixChip) return prefixChip.label;

  return base;
}

export function getDiscoverCityTotal(homeCity: string): number {
  const key = resolveDiscoverCityKey(homeCity);
  return DISCOVER_CITY_TOTALS[key] ?? DEFAULT_CITY_TOTAL;
}

export interface DiscoverStatsCopyInput {
  homeCity: string;
  chosenCount: number | null;
  loading?: boolean;
}

export function buildDiscoverStatsCopy({
  homeCity,
  chosenCount,
  loading = false,
}: DiscoverStatsCopyInput): string {
  const city = homeCity.trim() || "your city";
  const total = getDiscoverCityTotal(homeCity);
  const formattedTotal = formatDiscoverNumber(total);

  if (loading || chosenCount === null) {
    return `Out of ${formattedTotal} events happening in ${city} this month, we're choosing the ones you'll love`;
  }

  const formattedChosen = formatDiscoverNumber(chosenCount);
  return `Out of ${formattedTotal} events happening in ${city} this month, we've chosen ${formattedChosen} that are interesting for you`;
}

export function buildDiscoverFilterSecondary(stats: FilterStats): string {
  const inCount = formatDiscoverNumber(stats.candidates_in);
  const outCount = formatDiscoverNumber(stats.candidates_out);
  return `Filtered from ${inCount} candidates · ${outCount} passed your profile`;
}
