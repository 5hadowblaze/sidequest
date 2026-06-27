"use client";

import { useEffect } from "react";

import BrandLogo from "@/components/BrandLogo";

interface CelebrationStepProps {
  homeCity: string;
  onFinish: () => void;
}

const CONFETTI = [
  { left: "8%", delay: "0s", color: "var(--purple)", size: 8 },
  { left: "18%", delay: "0.15s", color: "var(--coral)", size: 6 },
  { left: "28%", delay: "0.05s", color: "var(--teal)", size: 10 },
  { left: "42%", delay: "0.2s", color: "var(--amber)", size: 7 },
  { left: "55%", delay: "0.1s", color: "var(--purple)", size: 9 },
  { left: "68%", delay: "0.25s", color: "var(--coral)", size: 6 },
  { left: "78%", delay: "0.08s", color: "var(--teal)", size: 8 },
  { left: "88%", delay: "0.18s", color: "var(--amber)", size: 7 },
  { left: "95%", delay: "0.12s", color: "var(--purple)", size: 5 },
];

export default function CelebrationStep({
  homeCity,
  onFinish,
}: CelebrationStepProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 2200);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="relative overflow-hidden px-6 py-10 sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className="onboarding-confetti-piece absolute top-0 rounded-full"
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="animate-celebrate mb-6">
          <BrandLogo size={88} className="text-purple" />
        </div>

        <h2 className="animate-onboarding-step-in text-3xl font-bold tracking-tight text-foreground">
          You&apos;re in! 🎉
        </h2>
        <p className="animate-fade-in stagger-2 mt-3 max-w-sm text-base text-muted">
          Sidequest unlocked for{" "}
          <span className="font-semibold text-foreground">{homeCity}</span>.
          <br />
          Loading your weekend chaos…
        </p>

        <div className="mt-8 flex items-center gap-2">
          <span className="quest-spinner h-5 w-5 border-2" />
          <span className="text-sm font-medium text-muted">Saving profile</span>
        </div>
      </div>
    </div>
  );
}
