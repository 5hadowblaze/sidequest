"use client";

import { useEffect, useState } from "react";

import {
  formatCitedPath,
  formatPlanFilterStats,
} from "@/lib/presentation";
import type { FilterStats, ItineraryItem, PlanResult } from "@/lib/types";

interface PlanResultsPanelProps {
  result: PlanResult;
  eventTitle?: string;
  confirmed: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}

const STAGGER_CLASSES = [
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
];

const CONFETTI = [
  { left: "12%", delay: "0s", color: "var(--purple)", size: 6 },
  { left: "32%", delay: "0.1s", color: "var(--teal)", size: 5 },
  { left: "52%", delay: "0.05s", color: "var(--coral)", size: 7 },
  { left: "72%", delay: "0.15s", color: "var(--amber)", size: 5 },
  { left: "88%", delay: "0.08s", color: "var(--purple)", size: 6 },
];

export default function PlanResultsPanel({
  result,
  eventTitle,
  confirmed,
  onClose,
  onConfirm,
  onEdit,
}: PlanResultsPanelProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!confirmed) {
      setShowCelebration(false);
      return;
    }
    setShowCelebration(true);
    const timer = window.setTimeout(() => setShowCelebration(false), 2200);
    return () => window.clearTimeout(timer);
  }, [confirmed]);

  return (
    <div
      className="animate-celebrate fixed inset-x-0 bottom-0 z-40 flex max-h-[62vh] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:max-h-[78vh] md:w-[420px] md:rounded-3xl"
    >
      {showCelebration && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 overflow-hidden" aria-hidden>
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className="onboarding-confetti-piece absolute top-0 rounded-full"
              style={{
                left: piece.left,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative shrink-0 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-logo-gradient"
          aria-hidden
        />
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg" aria-hidden>
                {confirmed ? "✓" : "🎉"}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple">
                {confirmed ? "Weekend set" : "Your weekend plan"}
              </p>
              {confirmed && (
                <span
                  className="rounded-full bg-teal px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  Confirmed ✓
                </span>
              )}
            </div>
            {eventTitle && (
              <p className="mt-1 text-sm text-muted">
                Inspired by: {eventTitle}
              </p>
            )}
            {confirmed && (
              <p className="animate-fade-in mt-1 text-sm font-medium text-teal-deep">
                Your weekend is set — enjoy the quest.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label="Close plan"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {result.filter_stats && (
          <FilterStatsBanner stats={result.filter_stats} />
        )}

        <div className="mt-4 space-y-3">
          {result.itinerary.map((item: ItineraryItem, index) => (
            <ItineraryCard
              key={`${item.venue}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-teal-soft px-4 py-3 text-sm text-teal-deep">
          Saved to{" "}
          <code className="font-mono text-xs">
            {formatCitedPath(result.cited_path)}
          </code>
          {result.trace_id && (
            <p className="mt-1 text-xs opacity-80">Trace: {result.trace_id}</p>
          )}
        </div>
      </div>

      <div
        className="shrink-0 border-t border-border bg-surface px-5 py-4"
      >
        <div className="flex flex-col gap-2.5">
          {!confirmed ? (
            <>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-full bg-purple px-5 py-3 text-sm font-semibold text-background shadow-md transition hover:brightness-110"
              >
                Confirm plan ✓
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="btn-press inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
              >
                Edit plan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="btn-press inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ItineraryCard({
  item,
  index,
}: {
  item: ItineraryItem;
  index: number;
}) {
  return (
    <div
      className={`animate-slide-up rounded-xl border border-border bg-background p-4 ${STAGGER_CLASSES[index % STAGGER_CLASSES.length]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-purple">{item.time}</p>
          <p className="mt-1 font-semibold text-foreground">{item.venue}</p>
          <p className="text-sm text-muted">{item.activity}</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal-deep">
          {item.cost}
        </span>
      </div>
      {item.diet_access && item.diet_access !== "—" && (
        <p className="mt-2 text-xs text-muted-light">{item.diet_access}</p>
      )}
    </div>
  );
}

function FilterStatsBanner({ stats }: { stats: FilterStats }) {
  return (
    <div className="animate-fade-in rounded-xl border border-purple-soft bg-purple-soft px-4 py-3 text-sm text-purple-deep">
      <p className="font-semibold">Prometheux gate</p>
      <p className="mt-1 text-xs opacity-90">{formatPlanFilterStats(stats)}</p>
    </div>
  );
}
