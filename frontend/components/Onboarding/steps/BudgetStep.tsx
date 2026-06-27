"use client";

import { BUDGET_TIERS } from "../constants";
import StepShell from "../StepShell";

interface BudgetStepProps {
  budget: number;
  onBudgetChange: (value: number) => void;
  direction: "forward" | "back";
}

export default function BudgetStep({
  budget,
  onBudgetChange,
  direction,
}: BudgetStepProps) {
  const selectedTier = BUDGET_TIERS.find((tier) => tier.value === budget);
  const displayLabel = selectedTier?.label ?? `£${budget}`;
  const displayTagline = selectedTier?.tagline ?? "Custom budget";

  return (
    <StepShell
      stepKey="budget"
      direction={direction}
      title="What's the damage? 💸"
      subtitle="Weekend budget vibes — we'll keep plans in your lane (or send you to the moon if you pick YOLO)."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BUDGET_TIERS.map((tier, index) => {
          const active = budget === tier.value;
          return (
            <button
              key={tier.label}
              type="button"
              onClick={() => onBudgetChange(tier.value)}
              className={`btn-press onboarding-budget-card rounded-2xl border p-4 text-left transition ${
                active
                  ? "animate-chip-pop border-purple bg-purple-soft/40 shadow-md"
                  : "border-border bg-surface hover:border-purple/30"
              } stagger-${Math.min(index + 1, 6)} animate-fade-in`}
            >
              <span
                className={`block text-xl font-bold ${
                  active ? "text-purple" : "text-foreground"
                }`}
              >
                {tier.label}
              </span>
              <span className="mt-1 block text-xs text-muted">{tier.tagline}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`rounded-2xl border border-border bg-surface/80 px-4 py-3 text-center transition ${
          budget === 999 ? "animate-wiggle-once border-coral/50" : ""
        }`}
      >
        <p className="text-sm text-muted">
          Selected:{" "}
          <span className="font-semibold text-foreground">{displayLabel}</span>
          {budget !== 999 && (
            <span className="text-muted"> / weekend</span>
          )}
        </p>
        {budget === 999 ? (
          <p className="mt-1 text-xs font-medium text-coral">
            Chaotic good energy detected ✨
          </p>
        ) : !selectedTier ? (
          <p className="mt-1 text-xs text-muted">{displayTagline}</p>
        ) : null}
      </div>
    </StepShell>
  );
}
