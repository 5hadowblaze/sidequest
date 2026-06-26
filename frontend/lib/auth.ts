"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { storeGoogleAccessToken } from "./calendar";
import type { AuthUser } from "./types";

/** Read-only access to Google Calendar events (weekends / busy times). */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

const MOCK_USER_KEY = "sidequest-mock-user";
const LEGACY_MOCK_USER_KEY = "weekend-explorer-mock-user";
const DEBUG_RUN_ID = "post-fix-2";

/** Basic Google sign-in — no extra OAuth scopes (avoids redirect/consent failures). */
const googleSignInProvider = new GoogleAuthProvider();
googleSignInProvider.setCustomParameters({ prompt: "select_account" });

function createGoogleCalendarProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_READONLY_SCOPE);
  provider.setCustomParameters({ prompt: "consent" });
  return provider;
}

/** getRedirectResult must run at most once per full page load. */
let redirectResultHandled = false;

const AUTH_CHECK_TIMEOUT_MS = 3000;

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

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  hypothesisId = "H2",
) {
  // #region agent log
  fetch("http://127.0.0.1:7585/ingest/ed038ca3-794c-4179-bd29-41df952cd5c1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b7419b",
    },
    body: JSON.stringify({
      sessionId: "b7419b",
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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

function applyGoogleSignInResult(result: {
  user: User;
  accessToken: string | null;
}): AuthUser {
  storeGoogleAccessToken(result.accessToken);
  return mapFirebaseUser(result.user);
}

/** Request calendar scope after the user is already signed in with Firebase. */
export async function requestGoogleCalendarAccess(
  user: User,
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;

  const auth = getFirebaseAuth();
  const provider = createGoogleCalendarProvider();
  debugLog(
    "auth.ts:requestGoogleCalendarAccess:entry",
    "requesting calendar scope via reauthenticateWithPopup",
    { uid: user.uid },
    "H4",
  );

  try {
    const result = await reauthenticateWithPopup(auth.currentUser ?? user, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    debugLog(
      "auth.ts:requestGoogleCalendarAccess:success",
      "calendar scope granted",
      { hasAccessToken: Boolean(token) },
      "H4",
    );
    return token;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    debugLog(
      "auth.ts:requestGoogleCalendarAccess:error",
      "calendar scope request failed (sign-in still valid)",
      { code: e?.code ?? "unknown", errorMessage: e?.message ?? String(err) },
      "H4",
    );
    return null;
  }
}

async function resolveRedirectResult(
  auth: Auth,
): Promise<GoogleSignInResult | null> {
  if (redirectResultHandled) {
    debugLog(
      "auth.ts:resolveRedirectResult:skipped",
      "getRedirectResult already handled this page load",
      {},
      "H2",
    );
    return null;
  }
  redirectResultHandled = true;

  debugLog(
    "auth.ts:resolveRedirectResult:entry",
    "calling getRedirectResult",
    {
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
      origin: typeof window !== "undefined" ? window.location.origin : "unknown",
    },
    "H2",
  );

  const redirectResult = await getRedirectResult(auth);
  if (!redirectResult) {
    debugLog(
      "auth.ts:resolveRedirectResult:empty",
      "no pending redirect result",
      {},
      "H2",
    );
    return null;
  }

  const credential = GoogleAuthProvider.credentialFromResult(redirectResult);
  debugLog(
    "auth.ts:resolveRedirectResult:success",
    "getRedirectResult succeeded",
    {
      uid: redirectResult.user.uid,
      hasAccessToken: Boolean(credential?.accessToken),
    },
    "H2",
  );

  return {
    user: redirectResult.user,
    accessToken: credential?.accessToken ?? null,
  };
}

export async function signInWithGoogle(): Promise<GoogleSignInResult | AuthUser> {
  const firebaseReady = isFirebaseConfigured();
  debugLog(
    "auth.ts:signInWithGoogle:entry",
    "signInWithGoogle called",
    {
      firebaseReady,
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
      hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      hasAuthDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      hasProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    },
    "H1",
  );

  if (!firebaseReady) {
    const mockUser: AuthUser = {
      uid: `mock-${Date.now()}`,
      displayName: "Demo Explorer",
      email: "demo@weekend.local",
      photoURL: null,
    };
    writeMockUser(mockUser);
    debugLog(
      "auth.ts:signInWithGoogle:mock",
      "using mock auth path",
      { uid: mockUser.uid },
      "H5",
    );
    return mockUser;
  }

  const auth = getFirebaseAuth();
  debugLog(
    "auth.ts:signInWithGoogle:beforePopup",
    "calling signInWithPopup (basic Google sign-in, no calendar scope)",
    {},
    "H2",
  );

  try {
    const result = await signInWithPopup(auth, googleSignInProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    debugLog(
      "auth.ts:signInWithGoogle:success",
      "signInWithPopup succeeded",
      {
        uid: result.user.uid,
        hasAccessToken: Boolean(credential?.accessToken),
      },
      "H2",
    );

    return {
      user: result.user,
      accessToken: credential?.accessToken ?? null,
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    debugLog(
      "auth.ts:signInWithGoogle:error",
      "signInWithPopup failed",
      { code: e?.code ?? "unknown", errorMessage: e?.message ?? String(err) },
      "H2",
    );

    if (e.code === "auth/popup-blocked") {
      debugLog(
        "auth.ts:signInWithGoogle:redirectFallback",
        "popup blocked, falling back to signInWithRedirect",
        {
          hostname:
            typeof window !== "undefined" ? window.location.hostname : "unknown",
        },
        "H2",
      );
      try {
        await signInWithRedirect(auth, googleSignInProvider);
        throw Object.assign(new Error(mapAuthError(err)), {
          code: e.code,
          redirecting: true,
        });
      } catch (redirectErr) {
        const re = redirectErr as { code?: string; redirecting?: boolean };
        if (re.redirecting) throw redirectErr;
        debugLog(
          "auth.ts:signInWithGoogle:redirectError",
          "signInWithRedirect failed",
          {
            code: re?.code ?? "unknown",
            errorMessage:
              (redirectErr as { message?: string })?.message ??
              String(redirectErr),
          },
          "H2",
        );
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

  useEffect(() => {
    if (!firebaseReady) {
      setUser(readMockUser());
      setLoading(false);
      return;
    }

    let active = true;
    let loadingSettled = false;

    const settleLoading = (reason: string) => {
      if (!active || loadingSettled) return;
      loadingSettled = true;
      debugLog(
        "auth.ts:useAuth:settleLoading",
        "auth loading settled",
        { reason },
        "H2",
      );
      setLoading(false);
    };

    const authCheckTimeout = window.setTimeout(() => {
      debugLog(
        "auth.ts:useAuth:timeout",
        "auth check exceeded timeout, forcing loading false",
        { timeoutMs: AUTH_CHECK_TIMEOUT_MS },
        "H2",
      );
      settleLoading("timeout");
    }, AUTH_CHECK_TIMEOUT_MS);

    void (async () => {
      try {
        const auth = getFirebaseAuth();
        const redirectResult = await Promise.race([
          resolveRedirectResult(auth),
          new Promise<GoogleSignInResult | null>((resolve) => {
            window.setTimeout(() => {
              debugLog(
                "auth.ts:useAuth:redirectResultTimeout",
                "getRedirectResult exceeded timeout, continuing without it",
                { timeoutMs: AUTH_CHECK_TIMEOUT_MS },
                "H2",
              );
              resolve(null);
            }, AUTH_CHECK_TIMEOUT_MS);
          }),
        ]);
        if (redirectResult && active) {
          const mapped = applyGoogleSignInResult(redirectResult);
          setUser(mapped);
          setSignInError(null);
          void requestGoogleCalendarAccess(redirectResult.user).then((token) => {
            if (token && active) {
              storeGoogleAccessToken(token);
            }
          });
        }
      } catch (err) {
        if (active) {
          setSignInError(mapAuthError(err));
          debugLog(
            "auth.ts:useAuth:redirectResult:error",
            "getRedirectResult failed",
            {
              code: (err as { code?: string })?.code ?? "unknown",
              errorMessage:
                (err as { message?: string })?.message ?? String(err),
            },
            "H2",
          );
        }
        settleLoading("redirect-error");
      }
    })();

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      try {
        if (active) {
          setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
        }
      } finally {
        window.clearTimeout(authCheckTimeout);
        settleLoading("onAuthStateChanged");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(authCheckTimeout);
      unsubscribe();
    };
  }, [firebaseReady]);

  const handleSignIn = useCallback(async () => {
    debugLog(
      "auth.ts:handleSignIn:entry",
      "handleSignIn invoked",
      {
        firebaseReady,
        hostname:
          typeof window !== "undefined" ? window.location.hostname : "unknown",
      },
      "H3",
    );
    setSignInError(null);
    setSignInLoading(true);
    try {
      const result = await signInWithGoogle();
      if ("uid" in result) {
        setUser(result);
        debugLog(
          "auth.ts:handleSignIn:setUserMock",
          "setUser after mock sign-in",
          { uid: result.uid },
          "H5",
        );
      } else {
        setUser(applyGoogleSignInResult(result));
        debugLog(
          "auth.ts:handleSignIn:setUserFirebase",
          "setUser after firebase sign-in",
          { uid: result.user.uid },
          "H5",
        );
        void requestGoogleCalendarAccess(result.user).then((token) => {
          if (token) storeGoogleAccessToken(token);
        });
      }
      setSignInError(null);
    } catch (err) {
      const e = err as { code?: string; message?: string; redirecting?: boolean };
      if (e.redirecting) {
        debugLog(
          "auth.ts:handleSignIn:redirecting",
          "signInWithRedirect initiated, awaiting return navigation",
          { code: e.code ?? "unknown" },
          "H3",
        );
        return;
      }
      setSignInError(mapAuthError(err));
      debugLog(
        "auth.ts:handleSignIn:uncaught",
        "handleSignIn caught error",
        {
          code: e?.code ?? "unknown",
          errorMessage: e?.message ?? String(err),
          redirecting: false,
        },
        "H3",
      );
    } finally {
      setSignInLoading(false);
    }
  }, [firebaseReady]);

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
    isMockAuth: !firebaseReady,
  };
}
