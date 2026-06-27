"use client";

import { useCallback, useState } from "react";

import { createDefaultProfile } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";

import OnboardingProgress from "./Onboarding/OnboardingProgress";
import AccessibilityStep from "./Onboarding/steps/AccessibilityStep";
import ActivitiesStep from "./Onboarding/steps/ActivitiesStep";
import BudgetStep from "./Onboarding/steps/BudgetStep";
import CelebrationStep from "./Onboarding/steps/CelebrationStep";
import DietStep from "./Onboarding/steps/DietStep";
import WelcomeCityStep from "./Onboarding/steps/WelcomeCityStep";
import { joinList, parseList, toggleListItem } from "./Onboarding/utils";

export interface ProfileOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initial?: Partial<UserProfile>;
}

const STEP_IDS = [
  "welcome",
  "budget",
  "diet",
  "activities",
  "accessibility",
    "celebration",
] as const;

type StepId = (typeof STEP_IDS)[number];

export default function ProfileOnboarding({
  onComplete,
  initial,
}: ProfileOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [error, setError] = useState<string | null>(null);

  const [homeCity, setHomeCity] = useState(initial?.homeCity ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 150);
  const [dietItems, setDietItems] = useState<string[]>(
    parseList(initial?.diet ?? ""),
  );
  const [activityItems, setActivityItems] = useState<string[]>(
    parseList(initial?.activities ?? ""),
  );
  const [accessibilityItems, setAccessibilityItems] = useState<string[]>(
    parseList(initial?.accessibility ?? ""),
  );
  const [calendarConnected, setCalendarConnected] = useState(
    initial?.calendarConnected ?? false,
  );
  const [connectedSources, setConnectedSources] = useState<string[]>(
    initial?.connectedSources ?? [],
  );

  const step: StepId = STEP_IDS[stepIndex] ?? "welcome";
  const isCelebration = step === "celebration";

  const goForward = useCallback(() => {
    setDirection("forward");
    setStepIndex((current) => Math.min(current + 1, STEP_IDS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  function validateCurrentStep(): boolean {
    setError(null);

    if (step === "welcome" && !homeCity.trim()) {
      setError("Pick a city or type your own — we need a home base!");
      return false;
    }
    if (step === "diet" && dietItems.length === 0) {
      setError("Tap at least one diet option (or No restrictions).");
      return false;
    }
    if (step === "activities" && activityItems.length === 0) {
      setError("Pick at least one vibe — we can't read minds (yet).");
      return false;
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    goForward();
  }

  function handleDietToggle(label: string) {
    setDietItems((current) => {
      if (label === "No restrictions") {
        return current.includes(label) ? [] : [label];
      }
      const withoutNone = current.filter((item) => item !== "No restrictions");
      return toggleListItem(withoutNone, label);
    });
  }

  const handleFinish = useCallback(() => {
    onComplete(
      createDefaultProfile({
        homeCity: homeCity.trim(),
        budget,
        diet: joinList(dietItems),
        activities: joinList(activityItems),
        accessibility:
          accessibilityItems.length > 0
            ? joinList(accessibilityItems)
            : undefined,
        calendarConnected: calendarConnected || undefined,
        connectedSources:
          connectedSources.length > 0 ? connectedSources : undefined,
      }),
    );
  }, [
    onComplete,
    homeCity,
    budget,
    dietItems,
    activityItems,
    accessibilityItems,
    calendarConnected,
    connectedSources,
  ]);

  function handleToggleSource(sourceId: string) {
    setConnectedSources((current) =>
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId],
    );
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Profile onboarding"
    >
      <div className="animate-slide-up-sheet flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:animate-slide-up sm:rounded-3xl">
        {!isCelebration && (
          <>
            <div className="border-b border-border pb-4 pt-2">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border sm:hidden" />
              <OnboardingProgress step={stepIndex} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {step === "welcome" && (
                <WelcomeCityStep
                  homeCity={homeCity}
                  onCityChange={setHomeCity}
                  direction={direction}
                />
              )}
              {step === "budget" && (
                <BudgetStep
                  budget={budget}
                  onBudgetChange={setBudget}
                  direction={direction}
                />
              )}
              {step === "diet" && (
                <DietStep
                  selected={dietItems}
                  onToggle={handleDietToggle}
                  direction={direction}
                />
              )}
              {step === "activities" && (
                <ActivitiesStep
                  selected={activityItems}
                  onToggle={(label) =>
                    setActivityItems((current) => toggleListItem(current, label))
                  }
                  direction={direction}
                />
              )}
              {step === "accessibility" && (
                <AccessibilityStep
                  selected={accessibilityItems}
                  onToggle={(label) =>
                    setAccessibilityItems((current) =>
                      toggleListItem(current, label),
                    )
                  }
                  direction={direction}
                />
              )}
            </div>

            {error && (
              <div className="px-6 pb-2 sm:px-8">
                <p className="animate-shake rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-deep">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3 border-t border-border px-6 py-5 sm:px-8">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="btn-press flex-1 rounded-full border border-border py-3.5 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  Back
                </button>
              )}

              {step === "accessibility" ? (
                <>
                  <button
                    type="button"
                    onClick={goForward}
                    className="btn-press flex-1 rounded-full border border-border py-3.5 text-sm font-semibold text-muted transition hover:text-foreground"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-press flex-1 rounded-full bg-purple py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                  >
                    Next →
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-press flex-1 rounded-full bg-purple py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  {step === "welcome" ? "Let's go →" : "Next →"}
                </button>
              )}
            </div>
          </>
        )}

        {isCelebration && (
          <CelebrationStep homeCity={homeCity.trim()} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
