"use client";

import { formatRuleBadge } from "@/lib/calendar";
import type { DiscoverEvent } from "@/lib/types";

interface EventCardProps {
  event: DiscoverEvent;
  selected: boolean;
  onClick: () => void;
  index?: number;
  demoTarget?: string;
}

const STAGGER_CLASSES = [
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
];

export default function EventCard({
  event,
  selected,
  onClick,
  index = 0,
  demoTarget,
}: EventCardProps) {
  const rules = event.passed_rules ?? [];
  const showBadges = rules.length > 0;
  const staggerClass = STAGGER_CLASSES[index % STAGGER_CLASSES.length];
  const dateLocation = [event.date_hint ?? "This weekend", event.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      data-demo-target={demoTarget}
      className={`card-lift animate-slide-up group w-full overflow-hidden rounded-xl border bg-surface text-left ${staggerClass} ${
        selected
          ? "event-card--map-selected border-purple/60 ring-2 ring-purple/25"
          : "border-border hover:border-border-strong"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        <img
          src={event.image_url}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
        {selected && (
          <span className="event-card__map-pin absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-purple/40 bg-surface/90 px-2.5 py-1 text-[10px] font-medium tracking-wide text-purple backdrop-blur-sm">
            <span className="event-card__map-pin-dot" aria-hidden="true" />
            On map
          </span>
        )}
        {event.prometheux_verified && (
          <span className="absolute left-3 top-3 rounded-md bg-surface/90 px-2 py-1 text-[10px] font-medium tracking-wide text-foreground uppercase backdrop-blur-sm">
            Verified
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-md bg-foreground/80 px-2.5 py-1 text-xs font-medium text-surface backdrop-blur-sm">
          {event.price_label}
        </span>
      </div>

      <div className="space-y-2 px-4 py-4">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
          {event.category}
        </p>
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-foreground">
          {event.title}
        </h3>
        <p className="line-clamp-1 text-sm text-muted">{dateLocation}</p>

        {showBadges && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {rules.slice(0, 3).map((rule) => (
              <span
                key={rule}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted"
              >
                {formatRuleBadge(rule)}
              </span>
            ))}
            {rules.length > 3 && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-light">
                +{rules.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
