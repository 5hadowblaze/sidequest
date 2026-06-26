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
      {loading && (
        <p
          className="discover-sponsor-strip"
          aria-label="Luma and Eventbrite feed Tavily live web search across Instagram, Google, and more"
        >
          <span className="discover-sponsor-strip-label">Event pipeline</span>
          <span className="discover-sponsor discover-sponsor--luma">Luma</span>
          <span className="discover-sponsor-sep">·</span>
          <span className="discover-sponsor discover-sponsor--eventbrite">Eventbrite</span>
          <span className="discover-sponsor-sep">→</span>
          <span
            className="discover-sponsor discover-sponsor--tavily"
            title="Instagram, social posts, Google & other event sites"
          >
            Tavily
          </span>
          <span className="discover-sponsor-sep">→</span>
          <span className="discover-sponsor discover-sponsor--prometheux">Prometheux</span>
          <span className="discover-sponsor-sep">→</span>
          <span className="discover-sponsor discover-sponsor--langfuse">Langfuse</span>
        </p>
      )}
    </div>
  );
}
