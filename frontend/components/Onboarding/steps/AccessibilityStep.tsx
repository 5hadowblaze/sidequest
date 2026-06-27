"use client";

import { ACCESSIBILITY_TOGGLES } from "../constants";
import SelectChip from "../SelectChip";
import StepShell from "../StepShell";

interface AccessibilityStepProps {
  selected: string[];
  onToggle: (label: string) => void;
  direction: "forward" | "back";
}

export default function AccessibilityStep({
  selected,
  onToggle,
  direction,
}: AccessibilityStepProps) {
  return (
    <StepShell
      stepKey="accessibility"
      direction={direction}
      title="Any access needs? ♿"
      subtitle="Totally optional — tap what matters, or skip and we'll still do our best."
    >
      <div className="flex flex-wrap gap-2">
        {ACCESSIBILITY_TOGGLES.map(({ label, emoji }, index) => (
          <SelectChip
            key={label}
            label={label}
            emoji={emoji}
            active={selected.includes(label)}
            onClick={() => onToggle(label)}
            className={`stagger-${Math.min(index + 1, 6)} animate-fade-in`}
          />
        ))}
      </div>

      {selected.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
          No selections yet — hit skip if you&apos;re good!
        </p>
      ) : (
        <p className="animate-fade-in text-sm text-teal">
          Got it — we&apos;ll prioritize accessible options where we can.
        </p>
      )}
    </StepShell>
  );
}
