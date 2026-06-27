"use client";

import BrandLogo from "@/components/BrandLogo";

import { CITY_CHIPS } from "../constants";
import SelectChip from "../SelectChip";
import StepShell from "../StepShell";

interface WelcomeCityStepProps {
  homeCity: string;
  onCityChange: (city: string) => void;
  direction: "forward" | "back";
}

export default function WelcomeCityStep({
  homeCity,
  onCityChange,
  direction,
}: WelcomeCityStepProps) {
  return (
    <StepShell
      stepKey="welcome-city"
      direction={direction}
      title="Where's your weekend? 🌍"
      subtitle="Pick your home base — we'll hunt down events nearby. No passport required (yet)."
    >
      <div className="flex justify-center py-2">
        <div className="animate-bounce-subtle">
          <BrandLogo size={68} className="text-purple" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CITY_CHIPS.map(({ label, emoji }, index) => (
          <SelectChip
            key={label}
            label={label}
            emoji={emoji}
            active={homeCity === label}
            onClick={() => onCityChange(label)}
            className={`stagger-${Math.min(index + 1, 6)} animate-fade-in`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="custom-city" className="text-sm font-medium text-foreground">
          Or type your city
        </label>
        <input
          id="custom-city"
          className="onboarding-input w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-purple focus:ring-2 focus:ring-purple/25"
          placeholder="Somewhere weird & wonderful…"
          value={CITY_CHIPS.some((c) => c.label === homeCity) ? "" : homeCity}
          onChange={(e) => onCityChange(e.target.value)}
        />
        {homeCity && !CITY_CHIPS.some((c) => c.label === homeCity) && (
          <p className="animate-fade-in text-xs text-teal">
            ✓ Locked in: {homeCity}
          </p>
        )}
      </div>
    </StepShell>
  );
}
