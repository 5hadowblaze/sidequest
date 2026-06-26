"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  DEMO_SCRIPT,
  findDemoTarget,
  getTargetCenter,
  waitForTarget,
  type DemoAction,
  type DemoStep,
  type DemoWait,
} from "@/lib/demo-script";
import { deactivateDemoSession } from "@/lib/demo-session";
import { isDemoEnabled } from "@/lib/demo-enabled";

export interface DemoActions {
  ensureAuth: () => Promise<void>;
  ensureProfile: () => Promise<void>;
  isAuthReady: () => boolean;
  isProfileReady: () => boolean;
  isDiscoverLoading: () => boolean;
  isDiscoverReady: () => boolean;
  isEventDetailOpen: () => boolean;
  isPlanPlanning: () => boolean;
  isPlanDone: () => boolean;
  isPlanConfirmed: () => boolean;
}

interface DemoContextValue {
  isRunning: boolean;
  stepLabel: string | null;
  startDemo: () => void;
  stopDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const CURSOR_MOVE_MS = 650;
const CLICK_RIPPLE_MS = 500;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function waitForCondition(
  check: () => boolean,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const started = Date.now();
    const tick = () => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (check()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

interface DemoRunnerProps {
  actions: DemoActions;
  children: ReactNode;
}

export default function DemoRunner({ actions, children }: DemoRunnerProps) {
  if (!isDemoEnabled()) {
    return <>{children}</>;
  }

  const [isRunning, setIsRunning] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: -100,
    y: -100,
    visible: false,
  });
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(
    null,
  );
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);

  const actionsRef = useRef(actions);
  const abortRef = useRef<AbortController | null>(null);
  const highlightElsRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const clearHighlights = useCallback(() => {
    for (const el of highlightElsRef.current) {
      el.classList.remove("demo-highlight");
    }
    highlightElsRef.current.clear();
    setHighlightTarget(null);
  }, []);

  const stopDemo = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearHighlights();
    deactivateDemoSession();
    setIsRunning(false);
    setStepLabel(null);
    setCursor({ x: -100, y: -100, visible: false });
    setRipple(null);
  }, [clearHighlights]);

  const moveCursorTo = useCallback(
    async (el: HTMLElement, signal: AbortSignal) => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      await sleep(350, signal);
      const { x, y } = getTargetCenter(el);
      setCursor({ x, y, visible: true });
      await sleep(CURSOR_MOVE_MS, signal);
    },
    [],
  );

  const showRipple = useCallback((x: number, y: number) => {
    setRipple({ x, y, key: Date.now() });
    window.setTimeout(() => setRipple(null), CLICK_RIPPLE_MS);
  }, []);

  const applyHighlight = useCallback(
    async (target: string, durationMs: number, signal: AbortSignal) => {
      const el = await waitForTarget(target, 10000).catch(() => null);
      if (!el || signal.aborted) return;
      el.classList.add("demo-highlight");
      highlightElsRef.current.add(el);
      setHighlightTarget(target);
      await sleep(durationMs, signal);
      el.classList.remove("demo-highlight");
      highlightElsRef.current.delete(el);
      if (highlightTarget === target) setHighlightTarget(null);
    },
    [highlightTarget],
  );

  const performClick = useCallback(
    async (target: string, signal: AbortSignal) => {
      const el = await waitForTarget(target, 10000);
      await moveCursorTo(el, signal);
      const { x, y } = getTargetCenter(el);
      showRipple(x, y);
      el.click();
      await sleep(400, signal);
    },
    [moveCursorTo, showRipple],
  );

  const runAction = useCallback(async (action: DemoAction, signal: AbortSignal) => {
    const a = actionsRef.current;
    switch (action) {
      case "ensure-auth":
        if (!a.isAuthReady()) {
          const signInEl = findDemoTarget("sign-in");
          if (signInEl) {
            await moveCursorTo(signInEl, signal);
            const { x, y } = getTargetCenter(signInEl);
            showRipple(x, y);
          }
          await a.ensureAuth();
          await waitForCondition(() => a.isAuthReady(), 8000, signal);
        }
        break;
      case "ensure-profile":
        await a.ensureProfile();
        await waitForCondition(() => a.isProfileReady(), 10000, signal);
        break;
      case "open-pipeline": {
        const el = findDemoTarget("pipeline-flow");
        if (el) {
          const isOpen = el.getAttribute("aria-expanded") === "true";
          if (!isOpen) {
            await moveCursorTo(el, signal);
            el.click();
          }
          await sleep(700, signal);
        }
        break;
      }
    }
  }, [moveCursorTo, showRipple]);

  const runWait = useCallback(async (condition: DemoWait, timeoutMs: number, signal: AbortSignal) => {
    const a = actionsRef.current;
    const check = (): boolean => {
      switch (condition) {
        case "auth-ready":
          return a.isAuthReady();
        case "profile-ready":
          return a.isProfileReady();
        case "discover-loading":
          return a.isDiscoverLoading();
        case "discover-ready":
          return a.isDiscoverReady();
        case "event-detail":
          return a.isEventDetailOpen();
        case "plan-planning":
          return a.isPlanPlanning();
        case "plan-done":
          return a.isPlanDone();
        case "plan-confirmed":
          return a.isPlanConfirmed();
        default:
          return false;
      }
    };

    if (condition === "discover-loading" && a.isDiscoverReady()) {
      return;
    }
    if (condition === "discover-ready" && a.isDiscoverReady()) {
      return;
    }
    if (condition === "event-detail" && a.isEventDetailOpen()) {
      return;
    }
    if (condition === "plan-done" && a.isPlanDone()) {
      return;
    }
    if (condition === "plan-confirmed" && a.isPlanConfirmed()) {
      return;
    }

    await waitForCondition(check, timeoutMs, signal);
  }, []);

  const runStep = useCallback(
    async (step: DemoStep, signal: AbortSignal) => {
      setStepLabel(step.label);

      switch (step.type) {
        case "delay":
          await sleep(step.ms, signal);
          break;
        case "action":
          await runAction(step.action, signal);
          break;
        case "wait":
          await runWait(step.condition, step.timeoutMs ?? 15000, signal);
          break;
        case "highlight":
          await applyHighlight(step.target, step.durationMs ?? 2500, signal);
          break;
        case "scroll": {
          const el = await waitForTarget(step.target, 10000);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(600, signal);
          break;
        }
        case "click":
          await performClick(step.target, signal);
          break;
      }
    },
    [applyHighlight, performClick, runAction, runWait],
  );

  const startDemo = useCallback(async () => {
    if (isRunning) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight / 2, visible: true });

    try {
      for (const step of DEMO_SCRIPT) {
        await runStep(step, controller.signal);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Demo failed:", err);
      }
    } finally {
      if (!controller.signal.aborted) {
        clearHighlights();
        deactivateDemoSession();
        setIsRunning(false);
        setStepLabel(null);
        setCursor({ x: -100, y: -100, visible: false });
      }
    }
  }, [clearHighlights, isRunning, runStep]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearHighlights();
    };
  }, [clearHighlights]);

  const value: DemoContextValue = {
    isRunning,
    stepLabel,
    startDemo: () => void startDemo(),
    stopDemo,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}

      {isRunning && (
        <>
          <div className="demo-blocker" aria-hidden="true" />
          <div className="demo-control-bar" role="status">
            <span className="demo-control-bar__pulse" aria-hidden="true" />
            <span className="demo-control-bar__label">Demo running…</span>
            <button
              type="button"
              className="demo-control-bar__stop"
              onClick={stopDemo}
            >
              Stop
            </button>
          </div>
          {stepLabel ? (
            <div className="demo-caption" role="status" aria-live="polite">
              <p className="demo-caption__text">{stepLabel}</p>
            </div>
          ) : null}
        </>
      )}

      {cursor.visible && (
        <div
          className="demo-cursor"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
          }}
          aria-hidden="true"
        >
          <DemoPointerIcon />
        </div>
      )}

      {ripple && (
        <span
          key={ripple.key}
          className="demo-click-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          aria-hidden="true"
        />
      )}
    </DemoContext.Provider>
  );
}

export function useDemoRunner(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemoRunner must be used within DemoRunner");
  }
  return ctx;
}

export function RunDemoButton({ className = "" }: { className?: string }) {
  if (!isDemoEnabled()) return null;

  const { isRunning, startDemo } = useDemoRunner();

  if (isRunning) return null;

  return (
    <button
      type="button"
      data-demo-target="run-demo"
      onClick={() => startDemo()}
      className={`demo-run-btn ${className}`}
    >
      <span className="demo-run-btn__icon" aria-hidden="true">
        ▶
      </span>
      Live Demo
    </button>
  );
}

function DemoPointerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M4 2.5L4 22.5L10.5 16.5L15.5 26.5L19.5 24.5L14.5 14.5L23 13.5L4 2.5Z"
        fill="white"
        stroke="#0a0a0a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
