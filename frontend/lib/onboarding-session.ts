const FORCE_ONBOARDING_KEY = "sidequest-force-onboarding";

/** Mark that the user just signed in and should see onboarding again. */
export function markForceOnboarding(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FORCE_ONBOARDING_KEY, "1");
}

export function shouldForceOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FORCE_ONBOARDING_KEY) === "1";
}

export function clearForceOnboarding(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(FORCE_ONBOARDING_KEY);
}
