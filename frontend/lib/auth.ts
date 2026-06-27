"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { getGoogleAccessToken, storeGoogleAccessToken } from "./calendar";
import { isMockAuthAllowed } from "./auth-policy";
import type { AuthUser } from "./types";


/**
 * Sensitive scope — requires Google OAuth app verification.
 * Not requested until the app is verified; onboarding uses UI-only calendar connect.
 */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

const MOCK_USER_KEY = "sidequest-mock-user";
const LEGACY_MOCK_USER_KEY = "weekend-explorer-mock-user";

export { isMockAuthAllowed } from "./auth-policy";

/** Google sign-in — Firebase default scopes only (email, profile, openid). */
const googleSignInProvider = new GoogleAuthProvider();
googleSignInProvider.setCustomParameters({ prompt: "select_account" });

/** getRedirectResult must run at most once per full page load. */
let redirectResultHandled = false;

/** Max wait when completing an OAuth redirect return (URL has auth params). */
const REDIRECT_RETURN_TIMEOUT_MS = 8000;
/** Safety net if auth listener never fires during a redirect return. */
const REDIRECT_SAFETY_TIMEOUT_MS = 10000;

/** True when the current URL looks like a return from signInWithRedirect / OAuth. */
function isLikelyAuthRedirectReturn(): boolean {
  if (typeof window === "undefined") return false;

  const { hash, search } = window.location;
  if (hash.length > 1) {
    if (
      hash.includes("__/auth/") ||
      hash.includes("access_token=") ||
      hash.includes("id_token=") ||
      hash.includes("apiKey=")
    ) {
      return true;
    }
  }

  if (search.length > 1) {
    const params = new URLSearchParams(search);
    if (params.has("code") && params.has("state")) return true;
    if (params.has("apiKey")) return true;
  }

  return false;
}

export interface GoogleSignInResult {
  user: User;
  accessToken: string | null;
}

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

function readMockUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  let raw = localStorage.getItem(MOCK_USER_KEY);
  if (!raw) {
    raw = localStorage.getItem(LEGACY_MOCK_USER_KEY);
    if (raw) {
      localStorage.setItem(MOCK_USER_KEY, raw);
      localStorage.removeItem(LEGACY_MOCK_USER_KEY);
    }
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeMockUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(LEGACY_MOCK_USER_KEY);
  } else {
    localStorage.removeItem(MOCK_USER_KEY);
    localStorage.removeItem(LEGACY_MOCK_USER_KEY);
  }
}

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  let message: string;
  switch (code) {
    case "auth/popup-blocked":
      message =
        "Your browser blocked the sign-in popup. Redirecting you to Google instead…";
      break;
    case "auth/popup-closed-by-user":
      message = "Sign-in was cancelled. Please try again.";
      break;
    case "auth/unauthorized-domain":
      message =
        "This site is not authorized for Firebase sign-in. Add your dev hostname (localhost and 127.0.0.1) under Firebase Console → Authentication → Settings → Authorized domains, then run `npx firebase-tools@latest deploy --only auth` from the repo root.";
      break;
    case "auth/invalid-continue-uri":
    case "auth/unauthorized-continue-uri":
    case "auth/missing-continue-uri":
      message =
        "Redirect URL is not allowed. Ensure your hostname is in Firebase authorized domains and matches NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.";
      break;
    case "auth/invalid-credential":
      message =
        "Google sign-in credentials were rejected. Try again or sign out of Google and pick your account again.";
      break;
    case "auth/operation-not-allowed":
      message =
        "Google sign-in is disabled for this Firebase project. Enable it under Authentication → Sign-in method.";
      break;
    case "auth/network-request-failed":
      message = "Network error. Check your connection and try again.";
      break;
    case "auth/account-exists-with-different-credential":
      message =
        "An account already exists with the same email using a different sign-in method.";
      break;
    default:
      message =
        (err as { message?: string })?.message ??
        "Sign-in failed. Please try again.";
  }
  return code ? `[${code}] ${message}` : message;
}

function applyGoogleSignInResult(result: { user: User }): AuthUser {
  return mapFirebaseUser(result.user);
}

/**
 * Calendar OAuth is disabled until Google verifies the app (sensitive scope).
 * Onboarding "Connect Google Calendar" is UI-only; slots use mock data.
 */
export async function requestGoogleCalendarAccess(
  _user: User,
): Promise<string | null> {
  return null;
}

/** No-op — does not open OAuth; returns any token already in session only. */
export async function ensureGoogleCalendarAccess(): Promise<string | null> {
  return getGoogleAccessToken();
}

async function resolveRedirectResult(
  auth: Auth,
): Promise<GoogleSignInResult | null> {
  if (redirectResultHandled) {
    return null;
  }
  redirectResultHandled = true;

  const redirectResult = await getRedirectResult(auth);
  if (!redirectResult) {
    return null;
  }

  const credential = GoogleAuthProvider.credentialFromResult(redirectResult);

  return {
    user: redirectResult.user,
    accessToken: credential?.accessToken ?? null,
  };
}

export async function signInWithGoogle(): Promise<GoogleSignInResult | AuthUser> {
  const firebaseReady = isFirebaseConfigured();

  if (!firebaseReady) {
    if (!isMockAuthAllowed()) {
      throw new Error(
        "Sign-in is unavailable: Firebase is not configured for this environment.",
      );
    }
    const mockUser: AuthUser = {
      uid: `mock-${Date.now()}`,
      displayName: "Explorer",
      email: "explorer@sidequest.app",
      photoURL: null,
    };
    writeMockUser(mockUser);
    return mockUser;
  }

  const auth = getFirebaseAuth();

  try {
    const result = await signInWithPopup(auth, googleSignInProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    return {
      user: result.user,
      accessToken: credential?.accessToken ?? null,
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };

    if (e.code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, googleSignInProvider);
        throw Object.assign(new Error(mapAuthError(err)), {
          code: e.code,
          redirecting: true,
        });
      } catch (redirectErr) {
        const re = redirectErr as { redirecting?: boolean };
        if (re.redirecting) throw redirectErr;
        throw redirectErr;
      }
    }

    throw err;
  }
}


export async function signOutUser(): Promise<void> {
  if (isFirebaseConfigured()) {
    await signOut(getFirebaseAuth());
  }
  storeGoogleAccessToken(null);
  writeMockUser(null);
}

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const firebaseReady = isFirebaseConfigured();
  const mockAuthAllowed = isMockAuthAllowed();

  useEffect(() => {
    if (!firebaseReady) {
      setUser(mockAuthAllowed ? readMockUser() : null);
      setLoading(false);
      return;
    }

    let active = true;
    let loadingSettled = false;
    const pendingRedirect = isLikelyAuthRedirectReturn();

    const settleLoading = () => {
      if (!active || loadingSettled) return;
      loadingSettled = true;
      setLoading(false);
    };

    let safetyTimeout: number | undefined;
    if (pendingRedirect) {
      safetyTimeout = window.setTimeout(() => {
        settleLoading();
      }, REDIRECT_SAFETY_TIMEOUT_MS);
    }

    const clearSafetyTimeout = () => {
      if (safetyTimeout !== undefined) {
        window.clearTimeout(safetyTimeout);
        safetyTimeout = undefined;
      }
    };

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      if (active) {
        if (firebaseUser) {
          setUser(mapFirebaseUser(firebaseUser));
        } else {
          setUser(null);
          setUser(null);
        }
      }

      if (!pendingRedirect) {
        clearSafetyTimeout();
        settleLoading();
      } else if (firebaseUser) {
        clearSafetyTimeout();
        settleLoading();
      }
    });

    if (pendingRedirect) {
      void (async () => {
        try {
          const auth = getFirebaseAuth();
          const redirectResult = await Promise.race([
            resolveRedirectResult(auth),
            new Promise<GoogleSignInResult | null>((resolve) => {
              window.setTimeout(() => resolve(null), REDIRECT_RETURN_TIMEOUT_MS);
            }),
          ]);
          if (redirectResult && active) {
            const mapped = applyGoogleSignInResult(redirectResult);
            setUser(mapped);
            setSignInError(null);
          }
        } catch (err) {
          if (active) {
            setSignInError(mapAuthError(err));
          }
        } finally {
          clearSafetyTimeout();
          settleLoading();
        }
      })();
    }

    return () => {
      active = false;
      clearSafetyTimeout();
      unsubscribe();
    };
  }, [firebaseReady]);

  const handleSignIn = useCallback(async () => {
    setSignInError(null);
    setSignInLoading(true);
    try {
      const result = await signInWithGoogle();
      if ("uid" in result) {
        setUser(result);
      } else {
        setUser(applyGoogleSignInResult(result));
      }
      setSignInError(null);
    } catch (err) {
      const e = err as { redirecting?: boolean };
      if (e.redirecting) {
        return;
      }
      setSignInError(mapAuthError(err));
    } finally {
      setSignInLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
  }, []);


  return {
    user,
    loading,
    signInError,
    signInLoading,
    signInWithGoogle: handleSignIn,
    signOut: handleSignOut,
    isMockAuth: mockAuthAllowed,
  };
}
