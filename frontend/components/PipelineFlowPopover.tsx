"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { isFastDiscoverMode } from "@/lib/discover-mode";
import { useDiscoverPhase } from "@/lib/pipeline-context";
import type { PlannerStatus } from "@/lib/types";

type PipelineFlowPopoverProps = {
  discoverLoading?: boolean;
  planStatus?: PlannerStatus;
  className?: string;
};

type StepId =
  | "auth"
  | "profile"
  | "calendar"
  | "tavily"
  | "prometheux"
  | "gemini"
  | "output";

type PartnerId = "tavily" | "prometheux" | "langfuse";

const EVENT_SOURCES: {
  id: "luma" | "eventbrite";
  name: string;
  tagline: string;
  accent: "coral" | "amber";
}[] = [
  {
    id: "luma",
    name: "Luma API",
    tagline: "Curated pop-ups & community events",
    accent: "coral",
  },
  {
    id: "eventbrite",
    name: "Eventbrite",
    tagline: "Web scraping for ticketed listings",
    accent: "amber",
  },
];

const HACKATHON_PARTNERS: {
  id: PartnerId;
  name: string;
  tagline: string;
  poweredLabel: string;
  accent: "teal" | "purple" | "amber";
  trackFocus?: boolean;
}[] = [
  {
    id: "tavily",
    name: "Tavily",
    tagline: "Live search — Instagram, Google & more",
    poweredLabel: "Powered by Tavily",
    accent: "teal",
  },
  {
    id: "prometheux",
    name: "Prometheux",
    tagline: "Logic filter — hackathon track focus",
    poweredLabel: "Powered by Prometheux",
    accent: "purple",
    trackFocus: true,
  },
  {
    id: "langfuse",
    name: "Langfuse · ClickHouse",
    tagline: "Every agent call traced — spans stored in ClickHouse",
    poweredLabel: "Observed via Langfuse",
    accent: "amber",
  },
];

const MAIN_STEPS: {
  id: StepId;
  label: string;
  partner: string;
  description: string;
  accent: "purple" | "teal" | "amber" | "coral";
  sponsor?: boolean;
}[] = [
  {
    id: "auth",
    label: "Sign in",
    partner: "Firebase Auth",
    description: "Google OAuth establishes a secure session for your account.",
    accent: "amber",
  },
  {
    id: "profile",
    label: "Your profile",
    partner: "Firestore",
    description: "Diet, budget, and activity preferences persist to your user doc.",
    accent: "amber",
  },
  {
    id: "calendar",
    label: "Free time",
    partner: "Google Calendar",
    description: "Weekend slots are read so plans only use time you actually have.",
    accent: "coral",
  },
  {
    id: "tavily",
    label: "Web search",
    partner: "Tavily",
    description:
      "After Luma and Eventbrite feed the index, Tavily enriches listings via live web search — Instagram, social posts, Google, and other event sites.",
    accent: "teal",
    sponsor: true,
  },
  {
    id: "prometheux",
    label: "Constraint filter",
    partner: "Prometheux",
    description: "Datalog rules verify sources, dedupe results, and apply hard constraints.",
    accent: "purple",
    sponsor: true,
  },
  {
    id: "gemini",
    label: "Format & plan",
    partner: "Gemini",
    description: "LLM turns filtered events into a structured, narrated weekend itinerary.",
    accent: "teal",
  },
  {
    id: "output",
    label: "Cited output",
    partner: "Sidequest · cited.md",
    description: "Shareable markdown plan with linked sources — ready for judges and friends.",
    accent: "purple",
  },
];

const STEP_ORDER: StepId[] = [
  "auth",
  "profile",
  "calendar",
  "tavily",
  "prometheux",
  "gemini",
  "output",
];
const PLAN_CYCLE: StepId[] = ["gemini", "output"];
const PLAN_CYCLE_MS = 2200;

export default function PipelineFlowPopover({
  discoverLoading = false,
  planStatus = "idle",
  className = "",
}: PipelineFlowPopoverProps) {
  const discoverPhase = useDiscoverPhase();
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [planIndex, setPlanIndex] = useState(0);
  const [focusedPartner, setFocusedPartner] = useState<PartnerId | null>(null);

  const isPlanning = planStatus === "planning";
  const isRunning = discoverLoading || isPlanning;

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!isPlanning) {
      setPlanIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setPlanIndex((i) => (i + 1) % PLAN_CYCLE.length);
    }, PLAN_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [isPlanning]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeStep = resolveActiveStep(
    discoverLoading,
    discoverPhase,
    isPlanning,
    planIndex,
  );

  function stepState(stepId: StepId): "idle" | "active" | "done" {
    if (activeStep === stepId) return "active";
    if (!isRunning) return "idle";

    const activeIdx = activeStep ? STEP_ORDER.indexOf(activeStep) : -1;
    const stepIdx = STEP_ORDER.indexOf(stepId);
    return stepIdx >= 0 && stepIdx < activeIdx ? "done" : "idle";
  }

  function handlePartnerFocus(partnerId: PartnerId) {
    setFocusedPartner((current) => (current === partnerId ? null : partnerId));
  }

  return (
    <div ref={rootRef} className={`pipeline-flow-root ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`pipeline-flow-badge btn-press ${isRunning ? "pipeline-flow-badge--live" : ""} ${open ? "pipeline-flow-badge--open" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        aria-label={
          open ? "Close architecture pipeline" : "Open architecture pipeline"
        }
        onClick={toggle}
      >
        <FlowIcon active={isRunning} />
        {isRunning && <span className="pipeline-flow-live-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-label="Sidequest architecture pipeline"
          className="pipeline-flow-popover pipeline-flow-popover--detailed animate-slide-up"
        >
          <header className="pipeline-flow-popover-header">
            <p className="pipeline-flow-eyebrow">Architecture</p>
            <h2 className="pipeline-flow-title">How Sidequest works</h2>
            <p className="pipeline-flow-lede">
              Live search, logic filtering, AI formatting, and traced agent calls from discover through your weekend plan.
            </p>
          </header>

          <section className="pipeline-flow-sources" aria-label="Event sources">
            <p className="pipeline-flow-sources-label">Event sources</p>
            <div className="pipeline-flow-source-row">
              {EVENT_SOURCES.map((source) => (
                <div
                  key={source.id}
                  className={`pipeline-flow-source pipeline-flow-source--${source.accent}`}
                >
                  <EventSourceIcon id={source.id} />
                  <span className="pipeline-flow-source-name">{source.name}</span>
                  <span className="pipeline-flow-source-tagline">{source.tagline}</span>
                </div>
              ))}
            </div>
            <div className="pipeline-flow-source-merge" aria-hidden="true">
              <span className="pipeline-flow-source-merge-line" />
              <span className="pipeline-flow-source-merge-arrow" />
              <span className="pipeline-flow-source-merge-label">Event index</span>
            </div>
          </section>


          <div className="pipeline-flow-main">
            <ol className="pipeline-flow-steps">
              {MAIN_STEPS.map((step, index) => {
                const state = stepState(step.id);
                const isActive = state === "active";
                const isDone = state === "done";
                const isSponsor = step.sponsor === true;
                const partnerFocus =
                  (step.id === "tavily" && focusedPartner === "tavily") ||
                  (step.id === "prometheux" && focusedPartner === "prometheux");

                return (
                  <li key={step.id} className="pipeline-flow-step-wrap">
                    {index > 0 && (
                      <span
                        className={`pipeline-flow-connector ${isActive || isDone ? "pipeline-flow-connector--lit" : ""} ${isSponsor ? "pipeline-flow-connector--sponsor" : ""}`}
                        aria-hidden="true"
                      >
                        <span className="pipeline-flow-connector-arrow" />
                      </span>
                    )}
                    <div
                      className={[
                        "pipeline-flow-step",
                        `pipeline-flow-step--${step.accent}`,
                        isSponsor ? "pipeline-flow-step--sponsor" : "",
                        isActive ? "pipeline-flow-step--active" : "",
                        isDone ? "pipeline-flow-step--done" : "",
                        partnerFocus ? "pipeline-flow-step--partner-focus" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <StepIcon id={step.id} large={isSponsor} />
                      <div className="pipeline-flow-step-copy">
                        {isSponsor && (
                          <span className="pipeline-flow-step-powered">Powered by</span>
                        )}
                        <span className="pipeline-flow-step-label">{step.label}</span>
                        <span className="pipeline-flow-step-partner">{step.partner}</span>
                        <p className="pipeline-flow-step-desc">{step.description}</p>
                      </div>
                      {isActive && (
                        <span className="pipeline-flow-step-pulse" aria-hidden="true" />
                      )}
                      {isSponsor && !isActive && (
                        <span className="pipeline-flow-sponsor-glow" aria-hidden="true" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <aside className="pipeline-flow-aside">
              <p className="pipeline-flow-aside-label">Side services</p>
              <div
                className={`pipeline-flow-note pipeline-flow-note--langfuse ${focusedPartner === "langfuse" ? "pipeline-flow-note--focused" : ""}`}
              >
                <LangfuseIcon large />
                <div>
                  <p className="pipeline-flow-note-powered">Observed via</p>
                  <p className="pipeline-flow-note-title">Langfuse · ClickHouse</p>
                  <p className="pipeline-flow-note-body">
                    Traces every agent call — latency, tokens, and spans persisted in
                    ClickHouse.
                  </p>
                </div>
              </div>
              <div className="pipeline-flow-note pipeline-flow-note--muted">
                <MppIcon />
                <div>
                  <p className="pipeline-flow-note-title">MPP micropayments</p>
                  <p className="pipeline-flow-note-body">
                    Optional per-query billing for premium discover queries.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {isRunning && activeStep && (
            <p className="pipeline-flow-status" role="status">
              {discoverLoading
                ? `Discovering events — ${stepLabel(activeStep)}`
                : `Planning weekend — ${stepLabel(activeStep)}`}
            </p>
          )}

          <p className="pipeline-flow-hint">
            Click outside or press Escape to close
          </p>
        </div>
      )}
    </div>
  );
}

function resolveActiveStep(
  discoverLoading: boolean,
  discoverPhase: 1 | 2,
  isPlanning: boolean,
  planIndex: number,
): StepId | null {
  if (isPlanning) return PLAN_CYCLE[planIndex];
  if (!discoverLoading) return null;
  if (isFastDiscoverMode()) return "tavily";
  return discoverPhase === 1 ? "tavily" : "prometheux";
}

function stepLabel(id: StepId): string {
  return MAIN_STEPS.find((s) => s.id === id)?.label ?? "";
}

function FlowIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={active ? "pipeline-flow-icon-spin" : ""}
    >
      <circle cx="3.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="14.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.2 8.1 7.6 5.2M10.4 5.2l2.4 2.9M10.4 12.8l2.1-2.8M5.2 9.9l2.4 2.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EventSourceIcon({ id }: { id: "luma" | "eventbrite" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    "aria-hidden": true as const,
    className: "pipeline-flow-source-icon",
  };

  if (id === "luma") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M9 5.5v7M5.5 9h7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="3" y="4.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6 8h6M6 10.5h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PartnerHeroIcon({ id }: { id: PartnerId }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 22 22",
    fill: "none",
    "aria-hidden": true as const,
    className: "partner-hero-icon",
  };

  switch (id) {
    case "tavily":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12.5 12.5l5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "prometheux":
      return (
        <svg {...common}>
          <path
            d="M3.5 11h4.5l2-4 2.5 8 2-4h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "langfuse":
      return (
        <svg {...common}>
          <path
            d="M3 17V5l7 5.5L17 5v12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function StepIcon({ id, large = false }: { id: StepId; large?: boolean }) {
  const size = large ? 20 : 16;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true as const,
    className: large ? "pipeline-flow-step-icon--large" : undefined,
  };

  switch (id) {
    case "auth":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="7"
            width="10"
            height="7"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M3.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "tavily":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "prometheux":
      return (
        <svg {...common}>
          <path
            d="M3 8h3.5l1.5-3 2 6 1.5-3H13"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "gemini":
      return (
        <svg {...common}>
          <path
            d="M8 2.5l1.2 3.6L13 7l-3.8 1.1L8 12l-1.2-3.9L3 7l3.8-0.9L8 2.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "output":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 7.5h5M5.5 10h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
  }
}

function LangfuseIcon({ large = false }: { large?: boolean }) {
  const size = large ? 18 : 14;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 11V3l5 4 5-4v8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" />
      <path d="M7 4.5v5M5 7.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
