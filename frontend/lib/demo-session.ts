import type { AuthUser } from "./types";

export const DEMO_SESSION_KEY = "sidequest-demo-session";

export const DEMO_USER: AuthUser = {
  uid: "demo-sidequest-presenter",
  displayName: "Demo Explorer",
  email: "demo@sidequest.app",
  photoURL: null,
};

export function activateDemoSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DEMO_SESSION_KEY, "1");
}

export function deactivateDemoSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function isDemoSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}
