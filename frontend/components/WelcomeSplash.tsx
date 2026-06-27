"use client";

import BrandLogo from "@/components/BrandLogo";

export default function WelcomeSplash() {
  return (
    <div
      className="bg-quest-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      role="status"
      aria-live="polite"
      aria-label="Launching Sidequest"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      >
        <div className="launch-splash-glow launch-splash-glow--purple" />
        <div className="launch-splash-glow launch-splash-glow--teal" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="launch-splash-logo">
          <BrandLogo size={80} className="text-purple" />
        </div>

        <h1 className="launch-splash-title mt-8 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome to Sidequest
        </h1>
        <p className="launch-splash-tagline mt-2 text-sm tracking-wide text-muted">
          your weekend, verified
        </p>
      </div>

      <div
        className="launch-splash-progress absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] left-1/2 w-44 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="launch-splash-progress-track">
          <div className="launch-splash-progress-fill" />
        </div>
      </div>
    </div>
  );
}
