"use client";

import {
  buildDiscoverFilterSecondary,
  buildDiscoverStatsCopy,
} from "@/lib/discover-stats";
import type { FilterStats } from "@/lib/types";

interface DiscoverStatsHeaderProps {
  homeCity: string;
  chosenCount: number | null;
  loading?: boolean;
  filterStats?: FilterStats | null;
  className?: string;
}

export default function DiscoverStatsHeader({
  homeCity,
  chosenCount,
  loading = false,
  filterStats,
  className = "",
}: DiscoverStatsHeaderProps) {
  const copy = buildDiscoverStatsCopy({
    homeCity,
    chosenCount,
    loading,
  });

  const filterSecondary = filterStats
    ? buildDiscoverFilterSecondary(filterStats)
    : null;

  return (
    <div className={`discover-stats ${className}`.trim()}>
      <p className="discover-stats-primary">{copy}</p>
      {filterSecondary && (
        <p className="discover-stats-secondary">{filterSecondary}</p>
      )}
    </div>
  );
}
