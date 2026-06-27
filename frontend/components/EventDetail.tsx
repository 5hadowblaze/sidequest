"use client";

import { getCategoryColors } from "@/lib/category-colors";
import { sanitizeExternalUrl, sanitizeImageUrl } from "@/lib/safe-url";
import type { DiscoverEvent, PlannerStatus } from "@/lib/types";

interface EventDetailProps {
  event: DiscoverEvent;
  onClose: () => void;
  onPlan: () => void;
  planStatus: PlannerStatus;
  planError: string | null;
}

export default function EventDetail({
  event,
  onClose,
  onPlan,
  planStatus,
  planError,
}: EventDetailProps) {
  const isPlanning = planStatus === "planning";
  const categoryColors = getCategoryColors(event.category);
  const imageUrl = sanitizeImageUrl(event.image_url);
  const sourceUrl = sanitizeExternalUrl(event.url);

  return (
    <div className="animate-slide-up flex h-full flex-col bg-surface">
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-surface-muted">
        <img
          src={imageUrl}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          className="btn-press absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/95 text-muted shadow-md backdrop-blur-sm transition hover:bg-surface hover:text-foreground"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryColors.bg} ${categoryColors.text}`}
          >
            {event.category}
          </span>
          <span className="rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal-deep">
            {event.price_label}
          </span>
          {event.prometheux_verified && (
            <span className="rounded-full bg-teal px-3 py-1 text-xs font-semibold text-white">
              Prometheux verified
            </span>
          )}
          {event.date_hint && (
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted">
              {event.date_hint}
            </span>
          )}
        </div>

        {(event.passed_rules?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.passed_rules!.map((rule) => (
              <span
                key={rule}
                className="rounded-full bg-purple-soft px-2.5 py-1 text-[11px] font-medium text-purple-deep"
              >
                {rule.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        <h2 className="mt-4 text-xl font-semibold leading-tight text-foreground">
          {event.title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          {event.description}
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-background p-4 text-sm">
          <p className="text-foreground/80">
            <span className="font-semibold text-foreground">Where:</span>{" "}
            {event.location}
          </p>
          <p className="text-foreground/80">
            <span className="font-semibold text-foreground">Coordinates:</span>{" "}
            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
          </p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-purple transition hover:text-purple-deep hover:underline"
            >
              View source →
            </a>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-6">
          {planError && (
            <p className="animate-fade-in rounded-xl border border-coral-soft bg-coral-soft px-4 py-3 text-sm text-coral-deep">
              {planError}
            </p>
          )}

          <button
            type="button"
            onClick={onPlan}
            disabled={isPlanning}
            className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-full bg-purple px-6 py-3.5 text-sm font-semibold text-background shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPlanning ? (
              <>
                <span className="h-4 w-4 animate-spin-gentle rounded-full border-2 border-background/30 border-t-background" />
                Planning your quest…
              </>
            ) : (
              "Plan this weekend ✨"
            )}
          </button>

          <p className="text-center text-xs text-muted-light">
            Uses your profile + this event via Tavily → Prometheux → Gemini
          </p>
        </div>
      </div>
    </div>
  );
}
