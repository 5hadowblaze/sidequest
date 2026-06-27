import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

export type VerifiedUser = {
  uid: string;
  email?: string;
};

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT;

  return initializeApp({
    ...(projectId ? { projectId } : {}),
    credential: applicationDefault(),
  });
}

export function isAppCheckConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY);
}

export function isAppCheckEnforcementRequired(): boolean {
  return process.env.NODE_ENV === "production" && isAppCheckConfigured();
}

/**
 * Verifies the Firebase App Check token when enforcement is enabled.
 * Returns a 401 Response on failure, or null when verification passes or is skipped.
 */
export async function verifyRequestAppCheck(
  request: NextRequest,
): Promise<Response | null> {
  const configured = isAppCheckConfigured();
  const enforce = isAppCheckEnforcementRequired();
  const token = request.headers.get("X-Firebase-AppCheck");

  if (!configured) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[App Check] NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY not set — skipping verification",
      );
    }
    return null;
  }

  if (!token) {
    if (!enforce) {
      console.warn("[App Check] Missing token — skipping enforcement in development");
      return null;
    }
    return Response.json({ detail: "App Check token required" }, { status: 401 });
  }

  try {
    await getAppCheck(getAdminApp()).verifyToken(token);
    return null;
  } catch {
    if (!enforce) {
      console.warn("[App Check] Invalid token — skipping enforcement in development");
      return null;
    }
    return Response.json({ detail: "Invalid App Check token" }, { status: 401 });
  }
}

/**
 * Verifies the Firebase ID token on an incoming API request.
 * Returns the verified user, or a 401 Response when auth fails.
 */
export async function verifyRequestAuth(
  request: NextRequest,
): Promise<VerifiedUser | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ detail: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return Response.json({ detail: "Authentication required" }, { status: 401 });
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch {
    return Response.json(
      { detail: "Invalid or expired token" },
      { status: 401 },
    );
  }
}

/**
 * Verifies App Check (when configured) then Firebase ID token.
 */
export async function verifyApiRequest(
  request: NextRequest,
): Promise<VerifiedUser | Response> {
  const appCheckResult = await verifyRequestAppCheck(request);
  if (appCheckResult) {
    return appCheckResult;
  }

  return verifyRequestAuth(request);
}
