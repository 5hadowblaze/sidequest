"use client";

import { ONBOARDING_STEP_COUNT } from "./constants";

interface OnboardingProgressProps {
  step: number;
}

export default function OnboardingProgress({ step }: OnboardingProgressProps) {
  const progress = Math.min(step / ONBOARDING_STEP_COUNT, 1);

  return (
    <div className="px-6 pt-5 sm:px-8">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
        <span>Your quest</span>
        <span>
          {Math.min(step + 1, ONBOARDING_STEP_COUNT + 1)} / {ONBOARDING_STEP_COUNT + 1}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="onboarding-progress-fill h-full rounded-full bg-gradient-to-r from-purple via-teal to-coral transition-all duration-500"
          style={{
            width: `${Math.max(progress * 100, 8)}%`,
            transitionTimingFunction: "var(--ease-bounce)",
          }}
        />
      </div>
    </div>
  );
}
