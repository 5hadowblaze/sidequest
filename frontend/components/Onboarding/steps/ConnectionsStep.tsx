"use client";

import { useCallback, useState } from "react";

import { OTHER_SOURCE_OPTIONS } from "../constants";
import SelectChip from "../SelectChip";
import StepShell from "../StepShell";

interface ConnectionsStepProps {
  calendarConnected: boolean;
  connectedSources: string[];
  onCalendarConnect: () => void;
  onToggleSource: (sourceId: string) => void;
  direction: "forward" | "back";
}

export default function ConnectionsStep({
  calendarConnected,
  connectedSources,
  onCalendarConnect,
  onToggleSource,
  direction,
}: ConnectionsStepProps) {
  const [showOtherSources, setShowOtherSources] = useState(
    connectedSources.length > 0,
  );
  const [calendarLoading, setCalendarLoading] = useState(false);

  const handleCalendarConnect = useCallback(() => {
    if (calendarConnected || calendarLoading) return;
    setCalendarLoading(true);
    window.setTimeout(() => {
      setCalendarLoading(false);
      onCalendarConnect();
    }, 900);
  }, [calendarConnected, calendarLoading, onCalendarConnect]);

  return (
    <StepShell
      stepKey="connections"
      direction={direction}
      title="Connect your world 🔗"
      subtitle="Link calendars and event feeds so Sidequest knows when you're free — and what's worth leaving the house for."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleCalendarConnect}
          disabled={calendarConnected || calendarLoading}
          className={`btn-press flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition ${
            calendarConnected
              ? "border-teal/40 bg-teal/10"
              : "border-border bg-foreground text-background hover:brightness-110"
          } disabled:cursor-default`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                calendarConnected ? "bg-teal/20" : "bg-background/15"
              }`}
              aria-hidden
            >
              {calendarLoading ? (
                <span className="h-5 w-5 animate-spin-gentle rounded-full border-2 border-background/30 border-t-background" />
              ) : (
                <GoogleCalendarIcon connected={calendarConnected} />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${
                  calendarConnected ? "text-foreground" : "text-background"
                }`}
              >
                {calendarConnected
                  ? "Google Calendar connected"
                  : "Connect Google Calendar"}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  calendarConnected ? "text-teal" : "text-background/70"
                }`}
              >
                {calendarConnected
                  ? "We'll respect your busy times"
                  : "Read-only · weekends & evenings"}
              </p>
            </div>
          </div>
          {calendarConnected && (
            <span className="shrink-0 text-lg font-bold text-teal" aria-hidden>
              ✓
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowOtherSources((open) => !open)}
          className="btn-press w-full rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-border/30"
        >
          {showOtherSources ? "Hide other sources" : "Connect other sources"}
        </button>

        {showOtherSources && (
          <div className="animate-fade-in space-y-3 rounded-2xl border border-dashed border-border bg-surface/80 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Event feeds · visual preview
            </p>
            <div className="flex flex-wrap gap-2">
              {OTHER_SOURCE_OPTIONS.map(({ id, label, emoji }, index) => (
                <SelectChip
                  key={id}
                  label={label}
                  emoji={emoji}
                  active={connectedSources.includes(id)}
                  onClick={() => onToggleSource(id)}
                  className={`stagger-${Math.min(index + 1, 6)} animate-fade-in`}
                />
              ))}
            </div>
            {connectedSources.length > 0 ? (
              <p className="text-xs text-teal">
                {connectedSources.length} source
                {connectedSources.length === 1 ? "" : "s"} queued — we'll wire
                these up soon.
              </p>
            ) : (
              <p className="text-xs text-muted">
                Tap a source to queue it. No OAuth needed for the demo.
              </p>
            )}
          </div>
        )}
      </div>
    </StepShell>
  );
}

function GoogleCalendarIcon({ connected }: { connected: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={connected ? "text-teal" : "text-background"}
    >
      <path
        fill="currentColor"
        d="M18 4h-1V2h-2v2H9V2H7v2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H6V9h12v11Z"
      />
      <path fill="currentColor" d="M8 11h2v2H8v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
    </svg>
  );
}
