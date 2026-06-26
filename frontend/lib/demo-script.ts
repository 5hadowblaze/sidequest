/** DOM targets located via `[data-demo-target="…"]`. */
export type DemoTarget =
  | "sign-in"
  | "pipeline-flow"
  | "source-luma"
  | "source-eventbrite"
  | "partner-tavily"
  | "partner-prometheux"
  | "partner-langfuse"
  | "discover-loading"
  | "discover-panel"
  | "chip-food"
  | "event-0"
  | "plan-button"
  | "plan-results"
  | "plan-actions"
  | "plan-confirm"
  | "plan-edit"
  | "plan-confirmed-badge";

export type DemoAction = "ensure-auth" | "ensure-profile" | "open-pipeline";

export type DemoWait =
  | "auth-ready"
  | "profile-ready"
  | "discover-loading"
  | "discover-ready"
  | "event-detail"
  | "plan-planning"
  | "plan-done"
  | "plan-confirmed";

export type DemoStep =
  | { id: string; type: "delay"; ms: number; label: string }
  | { id: string; type: "action"; action: DemoAction; label: string }
  | {
      id: string;
      type: "wait";
      condition: DemoWait;
      timeoutMs?: number;
      label: string;
    }
  | {
      id: string;
      type: "highlight";
      target: DemoTarget;
      durationMs?: number;
      label: string;
    }
  | { id: string; type: "scroll"; target: DemoTarget; label: string }
  | { id: string; type: "click"; target: DemoTarget; label: string };

/** ~70s narrated walkthrough at talking pace. */
export const DEMO_SCRIPT: DemoStep[] = [
  {
    id: "intro",
    type: "delay",
    ms: 2500,
    label: "Welcome to Sidequest — your AI weekend planner",
  },
  {
    id: "auth",
    type: "action",
    action: "ensure-auth",
    label: "Signing in with Google…",
  },
  {
    id: "auth-wait",
    type: "wait",
    condition: "auth-ready",
    timeoutMs: 8000,
    label: "Authenticated",
  },
  {
    id: "auth-pause",
    type: "delay",
    ms: 2000,
    label: "Sidequest learns your preferences from Firebase",
  },
  {
    id: "profile",
    type: "action",
    action: "ensure-profile",
    label: "Loading your London profile…",
  },
  {
    id: "profile-wait",
    type: "wait",
    condition: "profile-ready",
    timeoutMs: 10000,
    label: "Profile ready",
  },
  {
    id: "pipeline-badge",
    type: "highlight",
    target: "pipeline-flow",
    durationMs: 2000,
    label: "Architecture pipeline — our hackathon stack",
  },
  {
    id: "pipeline-open",
    type: "action",
    action: "open-pipeline",
    label: "Opening the multi-agent pipeline",
  },
  {
    id: "pipeline-settle",
    type: "delay",
    ms: 700,
    label: "Events flow from Luma and Eventbrite into our index",
  },
  {
    id: "source-luma-highlight",
    type: "highlight",
    target: "source-luma",
    durationMs: 2800,
    label: "Luma API — curated pop-ups and community events",
  },
  {
    id: "source-eventbrite-highlight",
    type: "highlight",
    target: "source-eventbrite",
    durationMs: 2800,
    label: "Eventbrite — web scraping for ticketed listings",
  },
  {
    id: "partner-tavily-highlight",
    type: "highlight",
    target: "partner-tavily",
    durationMs: 3500,
    label: "Tavily enriches the index — Instagram, social posts, Google & more",
  },
  {
    id: "partner-tavily-click",
    type: "click",
    target: "partner-tavily",
    label: "Live web search across Instagram, Google, and event sites via Tavily",
  },
  {
    id: "partner-prometheux-highlight",
    type: "highlight",
    target: "partner-prometheux",
    durationMs: 3500,
    label: "Prometheux — logic filter (track focus)",
  },
  {
    id: "partner-prometheux-click",
    type: "click",
    target: "partner-prometheux",
    label: "Hard constraints verified before results surface",
  },
  {
    id: "partner-langfuse-highlight",
    type: "highlight",
    target: "partner-langfuse",
    durationMs: 3500,
    label: "Langfuse traces every call — stored in ClickHouse",
  },
  {
    id: "partner-langfuse-click",
    type: "click",
    target: "partner-langfuse",
    label: "Full observability across the agent pipeline",
  },
  {
    id: "discover-wait-start",
    type: "wait",
    condition: "discover-loading",
    timeoutMs: 12000,
    label: "Discovering events near you…",
  },
  {
    id: "discover-loading",
    type: "highlight",
    target: "discover-loading",
    durationMs: 3500,
    label: "Luma + Eventbrite feed Tavily; wider web search, then Prometheux filters",
  },
  {
    id: "discover-ready",
    type: "wait",
    condition: "discover-ready",
    timeoutMs: 20000,
    label: "Events curated for your profile",
  },
  {
    id: "discover-pause",
    type: "delay",
    ms: 2000,
    label: "Browse personalized picks in Discover",
  },
  {
    id: "chip-scroll",
    type: "scroll",
    target: "chip-food",
    label: "Quick-search chips refine results",
  },
  {
    id: "chip-highlight",
    type: "highlight",
    target: "chip-food",
    durationMs: 2000,
    label: "Try “Food markets”",
  },
  {
    id: "chip-click",
    type: "click",
    target: "chip-food",
    label: "Searching food markets…",
  },
  {
    id: "chip-discover-loading",
    type: "wait",
    condition: "discover-loading",
    timeoutMs: 8000,
    label: "Re-running discover pipeline",
  },
  {
    id: "chip-discover-highlight",
    type: "highlight",
    target: "discover-panel",
    durationMs: 3000,
    label: "Prometheux verifies each candidate",
  },
  {
    id: "chip-discover-ready",
    type: "wait",
    condition: "discover-ready",
    timeoutMs: 20000,
    label: "Filtered food-market events",
  },
  {
    id: "event-pause",
    type: "delay",
    ms: 2000,
    label: "Pick an event that catches your eye",
  },
  {
    id: "event-scroll",
    type: "scroll",
    target: "event-0",
    label: "Scrolling to top event",
  },
  {
    id: "event-highlight",
    type: "highlight",
    target: "event-0",
    durationMs: 2500,
    label: "This one looks great",
  },
  {
    id: "event-click",
    type: "click",
    target: "event-0",
    label: "Opening event details",
  },
  {
    id: "event-detail-wait",
    type: "wait",
    condition: "event-detail",
    timeoutMs: 5000,
    label: "Event detail loaded",
  },
  {
    id: "plan-pause",
    type: "delay",
    ms: 2500,
    label: "Prometheux verified — ready to plan",
  },
  {
    id: "plan-highlight",
    type: "highlight",
    target: "plan-button",
    durationMs: 2500,
    label: "Plan your whole weekend around this event",
  },
  {
    id: "plan-click",
    type: "click",
    target: "plan-button",
    label: "Building your weekend itinerary…",
  },
  {
    id: "plan-pipeline",
    type: "action",
    action: "open-pipeline",
    label: "Gemini formats a cited weekend plan",
  },
  {
    id: "plan-planning",
    type: "wait",
    condition: "plan-planning",
    timeoutMs: 8000,
    label: "Planning in progress",
  },
  {
    id: "plan-done",
    type: "wait",
    condition: "plan-done",
    timeoutMs: 30000,
    label: "Plan ready",
  },
  {
    id: "results-highlight",
    type: "highlight",
    target: "plan-results",
    durationMs: 4500,
    label: "Your personalized weekend plan",
  },
  {
    id: "plan-actions-pause",
    type: "delay",
    ms: 1500,
    label: "Review your itinerary — confirm or start over",
  },
  {
    id: "plan-edit-highlight",
    type: "highlight",
    target: "plan-edit",
    durationMs: 2500,
    label: "Edit restarts Discover so you can pick again",
  },
  {
    id: "plan-confirm-highlight",
    type: "highlight",
    target: "plan-confirm",
    durationMs: 2500,
    label: "Lock in your weekend",
  },
  {
    id: "plan-confirm-click",
    type: "click",
    target: "plan-confirm",
    label: "Confirming your plan…",
  },
  {
    id: "plan-confirmed-wait",
    type: "wait",
    condition: "plan-confirmed",
    timeoutMs: 5000,
    label: "Weekend set!",
  },
  {
    id: "plan-confirmed-badge",
    type: "highlight",
    target: "plan-confirmed-badge",
    durationMs: 3000,
    label: "Your weekend is locked in",
  },
  {
    id: "pipeline-recap",
    type: "highlight",
    target: "pipeline-flow",
    durationMs: 3500,
    label: "End-to-end: Luma · Eventbrite → Tavily (web search) → Prometheux → Gemini",
  },
  {
    id: "outro",
    type: "delay",
    ms: 2500,
    label: "Demo complete — explore on your own!",
  },
];

export function findDemoTarget(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-demo-target="${target}"]`);
}

export function getTargetCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function waitForTarget(
  target: string,
  timeoutMs = 10000,
  intervalMs = 100,
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const el = findDemoTarget(target);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Demo target "${target}" not found`));
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/** Sum of fixed-delay steps for timing sanity checks. */
export function demoScriptFixedDelayMs(steps: DemoStep[] = DEMO_SCRIPT): number {
  return steps.reduce((total, step) => {
    if (step.type === "delay") return total + step.ms;
    if (step.type === "highlight") return total + (step.durationMs ?? 2500);
    return total;
  }, 0);
}
