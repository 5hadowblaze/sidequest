"use client";

import type { ReactNode } from "react";

interface StepShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  direction: "forward" | "back";
  stepKey: string;
}

export default function StepShell({
  title,
  subtitle,
  children,
  direction,
  stepKey,
}: StepShellProps) {
  const animClass =
    direction === "forward"
      ? "animate-onboarding-step-in"
      : "animate-onboarding-step-back";

  return (
    <div
      key={stepKey}
      className={`space-y-5 px-6 py-6 sm:px-8 ${animClass}`}
    >
      <header className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          {subtitle}
        </p>
      </header>
      {children}
    </div>
  );
}
