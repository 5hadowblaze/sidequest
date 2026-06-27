import { isFirebaseConfigured } from "./firebase";

/** Mock auth is allowed only in local development when Firebase is not configured. */
export function isMockAuthAllowed(): boolean {
  return process.env.NODE_ENV === "development" && !isFirebaseConfigured();
}
