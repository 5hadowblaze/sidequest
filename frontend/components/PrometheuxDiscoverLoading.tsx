"use client";

import { isFastDiscoverMode } from "@/lib/discover-mode";
import { useDiscoverPhase } from "@/lib/pipeline-context";

type PrometheuxDiscoverLoadingProps = {
  variant?: "panel" | "overlay";
};

export default function PrometheuxDiscoverLoading({
  variant = "panel",
}: PrometheuxDiscoverLoadingProps) {
  const fast = isFastDiscoverMode();
  const phase = useDiscoverPhase();

  const partnerId = fast ? null : phase === 1 ? "tavily" : "prometheux";

  const message = fast
    ? "Finding events for you…"
    : phase === 1
      ? "Tavily is searching Instagram, social posts, Google, and event listings"
      : "Prometheux is figuring out what events are suitable for you";

  const progressLabel = fast
    ? "Finding events"
    : phase === 1
      ? "Searching the web"
      : "Matching your profile";

  const subtext = fast
    ? null
    : phase === 1
      ? "Luma + Eventbrite feed the index; Tavily enriches with live web search…"
      : "Verifying results with Prometheux…";

  const progressClass = fast
    ? "prometheux-progress-fill prometheux-progress-fill--fast"
    : phase === 1
      ? "prometheux-progress-fill prometheux-progress-fill--phase1"
      : "prometheux-progress-fill prometheux-progress-fill--phase2";

  const content = (
    <>
      {partnerId ? (
        <div
          className={`discover-partner-brand discover-partner-brand--${partnerId}`}
          aria-hidden="true"
        >
          <span className="discover-partner-brand-ring" />
          <PartnerBrandIcon id={partnerId} />
          <span className="discover-partner-brand-powered">
            {partnerId === "tavily" ? "Powered by Tavily" : "Powered by Prometheux"}
          </span>
          <span className="discover-partner-brand-name">
            {partnerId === "tavily" ? "Tavily" : "Prometheux"}
          </span>
        </div>
      ) : (
        <div className="prometheux-discover-icon" aria-hidden="true">
          <SparkleIcon />
        </div>
      )}
      <p key={phase} className="prometheux-discover-message animate-fade-in">
        {message}
      </p>
      <p className="prometheux-progress-label" aria-hidden="true">
        {progressLabel}
      </p>
      <div className="prometheux-progress-track" aria-hidden="true">
        <div key={phase} className={progressClass} />
      </div>
      {subtext && (
        <p key={`sub-${phase}`} className="prometheux-discover-subtext animate-fade-in">
          {subtext}
        </p>
      )}
    </>
  );

  if (variant === "overlay") {
    return (
      <div
        className="prometheux-discover-overlay animate-fade-in"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="prometheux-discover-card">{content}</div>
      </div>
    );
  }

  return (
    <div
      className="prometheux-discover-panel animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {content}
    </div>
  );
}

function PartnerBrandIcon({ id }: { id: "tavily" | "prometheux" }) {
  if (id === "tavily") {
    return (
      <svg
        className="discover-partner-brand-icon"
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="15" cy="15" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M21 21l8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="discover-partner-brand-icon"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 18h7l3-6 4 12 3-6h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 3l1.6 5.4L21 10l-5.4 1.6L14 17l-1.6-5.4L7 10l5.4-1.6L14 3z"
        fill="url(#prometheux-sparkle-a)"
      />
      <path
        d="M22 16l.9 3.1L26 20l-3.1.9L22 24l-.9-3.1L18 20l3.1-.9L22 16z"
        fill="url(#prometheux-sparkle-b)"
        opacity="0.85"
      />
      <defs>
        <linearGradient id="prometheux-sparkle-a" x1="7" y1="3" x2="21" y2="17">
          <stop stopColor="var(--purple)" />
          <stop offset="1" stopColor="var(--teal)" />
        </linearGradient>
        <linearGradient id="prometheux-sparkle-b" x1="18" y1="16" x2="26" y2="24">
          <stop stopColor="var(--teal)" />
          <stop offset="1" stopColor="var(--purple-deep)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
