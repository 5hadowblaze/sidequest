import type { FilterStats } from "./types";

const DEMO_SOURCE_VALUES = new Set(["demo", "mock", "seed"]);

export function isDemoPresentationSource(source: string | null | undefined): boolean {
  if (!source) return false;
  if (DEMO_SOURCE_VALUES.has(source)) return true;
  return source.includes("+seed");
}

export function isDemoFilterStats(stats: FilterStats): boolean {
  if (stats.filter_method === "demo") return true;
  const concept = stats.concept_name.toLowerCase();
  return concept.includes("demo") || concept.includes("seed") || concept.includes("mock");
}

export function formatDiscoverFilterStats(stats: FilterStats): string {
  const summary = `${stats.candidates_in} → ${stats.candidates_out}`;
  if (isDemoFilterStats(stats)) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[discover] filter_stats", stats);
    }
    return summary;
  }
  return `${summary} via ${stats.filter_method}`;
}

export function formatPlanFilterStats(stats: FilterStats): string {
  const summary = `${stats.candidates_in} candidates in → ${stats.candidates_out} verified`;
  if (isDemoFilterStats(stats)) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[plan] filter_stats", stats);
    }
    return summary;
  }
  return `${summary} out via ${stats.filter_method} (${stats.concept_name})`;
}

export function formatCitedPath(path: string): string {
  if (/demo|mock|seed/i.test(path)) {
    return "your saved plans";
  }
  return path;
}
