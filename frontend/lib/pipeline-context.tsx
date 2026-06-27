"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isFastDiscoverMode } from "@/lib/discover-mode";

export type DiscoverPhase = 1 | 2;

const PHASE1_MS = 3000;

type PipelinePhaseContextValue = {
  discoverPhase: DiscoverPhase;
};

const PipelinePhaseContext = createContext<PipelinePhaseContextValue | null>(
  null,
);

export function PipelinePhaseProvider({
  discoverLoading,
  children,
}: {
  discoverLoading: boolean;
  children: ReactNode;
}) {
  const [discoverPhase, setDiscoverPhase] = useState<DiscoverPhase>(1);

  useEffect(() => {
    if (!discoverLoading) {
      setDiscoverPhase(1);
      return;
    }

    if (isFastDiscoverMode()) {
      setDiscoverPhase(1);
      return;
    }

    setDiscoverPhase(1);
    const timer = window.setTimeout(() => setDiscoverPhase(2), PHASE1_MS);
    return () => window.clearTimeout(timer);
  }, [discoverLoading]);

  const value = useMemo(
    () => ({ discoverPhase }),
    [discoverPhase],
  );

  return (
    <PipelinePhaseContext.Provider value={value}>
      {children}
    </PipelinePhaseContext.Provider>
  );
}

export function useDiscoverPhase(): DiscoverPhase {
  const ctx = useContext(PipelinePhaseContext);
  if (!ctx) {
    throw new Error("useDiscoverPhase must be used within PipelinePhaseProvider");
  }
  return ctx.discoverPhase;
}
