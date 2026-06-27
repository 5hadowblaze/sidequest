"use client";

import { DIET_OPTIONS } from "../constants";
import SelectChip from "../SelectChip";
import StepShell from "../StepShell";

interface DietStepProps {
  selected: string[];
  onToggle: (label: string) => void;
  direction: "forward" | "back";
}

export default function DietStep({
  selected,
  onToggle,
  direction,
}: DietStepProps) {
  return (
    <StepShell
      stepKey="diet"
      direction={direction}
      title="Fuel for the quest 🍕"
      subtitle="Tap everything that applies — we'll steer you away from sad salads (unless that's your thing)."
    >
      <div className="flex flex-wrap gap-2">
        {DIET_OPTIONS.map(({ label, emoji }, index) => (
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

      {selected.length > 0 && (
        <p className="animate-fade-in rounded-xl bg-teal-soft/30 px-4 py-3 text-sm text-foreground">
          {selected.includes("No restrictions")
            ? "All cuisines unlocked. Dangerous."
            : `${selected.length} preference${selected.length > 1 ? "s" : ""} noted — chef's kiss.`}
        </p>
      )}
    </StepShell>
  );
}
