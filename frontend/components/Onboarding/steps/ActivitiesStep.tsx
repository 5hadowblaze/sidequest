"use client";

import { ACTIVITY_OPTIONS } from "../constants";
import SelectChip from "../SelectChip";
import StepShell from "../StepShell";

interface ActivitiesStepProps {
  selected: string[];
  onToggle: (label: string) => void;
  direction: "forward" | "back";
}

export default function ActivitiesStep({
  selected,
  onToggle,
  direction,
}: ActivitiesStepProps) {
  return (
    <StepShell
      stepKey="activities"
      direction={direction}
      title="What's the vibe? ✨"
      subtitle="Multi-select your chaos — we'll match events to your energy level."
    >
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_OPTIONS.map(({ label, emoji }, index) => (
          <SelectChip
            key={label}
            label={label}
            emoji={emoji}
            active={selected.includes(label)}
            onClick={() => onToggle(label)}
            size="lg"
            className={`stagger-${Math.min(index + 1, 6)} animate-fade-in`}
          />
        ))}
      </div>

      {selected.length > 0 && (
        <div className="animate-celebrate flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item}
              className="rounded-full bg-purple-soft/50 px-3 py-1 text-xs font-medium text-purple"
            >
              {ACTIVITY_OPTIONS.find((o) => o.label === item)?.emoji} {item}
            </span>
          ))}
        </div>
      )}
    </StepShell>
  );
}
