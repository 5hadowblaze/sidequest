"use client";

import { getToken } from "firebase/app-check";

import { isMockAuthAllowed } from "./auth-policy";
import { getFirebaseAppCheck, getFirebaseAuth, isFirebaseConfigured } from "./firebase";

export class AuthenticationRequiredError extends Error {
  constructor(message = "Sign in required to use this feature.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export function requireAuthenticatedUser(): void {
  if (isMockAuthAllowed()) {
    return;
  }

  if (!isFirebaseConfigured()) {
    throw new AuthenticationRequiredError(
      "Sign-in is unavailable: Firebase is not configured for this environment.",
    );
  }

  if (!getFirebaseAuth().currentUser) {
    throw new AuthenticationRequiredError();
  }
}


async function getAppCheckHeader(): Promise<Record<string, string>> {
  const appCheck = getFirebaseAppCheck();
  if (!appCheck) {
    return {};
  }

  try {
    const { token } = await getToken(appCheck, false);
    return { "X-Firebase-AppCheck": token };
  } catch {
    return {};
  }
}

export async function getAuthHeaders(
  forceRefresh = false,
): Promise<Record<string, string>> {
  if (!isFirebaseConfigured()) {
    return {};
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return {};
  }

  const [idToken, appCheckHeaders] = await Promise.all([
    user.getIdToken(forceRefresh),
    getAppCheckHeader(),
  ]);

  return {
    Authorization: `Bearer ${idToken}`,
    ...appCheckHeaders,
  };
}

/**
 * fetch wrapper that attaches Firebase auth + App Check headers and retries once on 401.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const buildHeaders = async (forceRefresh: boolean) => {
    const headers = new Headers(init?.headers);
    const authHeaders = await getAuthHeaders(forceRefresh);
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }
    return headers;
  };

  let response = await fetch(input, {
    ...init,
    headers: await buildHeaders(false),
  });

  if (response.status === 401 && isFirebaseConfigured()) {
    const user = getFirebaseAuth().currentUser;
    if (user) {
      response = await fetch(input, {
        ...init,
        headers: await buildHeaders(true),
      });
    }
  }

  return response;
}
