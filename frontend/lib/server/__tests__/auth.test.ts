import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdTokenMock = vi.fn();
const verifyAppCheckTokenMock = vi.fn();

vi.mock("firebase-admin/app", () => ({
  applicationDefault: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: "test-app" })),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: vi.fn(() => ({
    verifyToken: verifyAppCheckTokenMock,
  })),
}));

import {
  isAppCheckEnforcementRequired,
  verifyApiRequest,
  verifyRequestAppCheck,
  verifyRequestAuth,
} from "../auth";

function makeRequest(
  path = "/api/discover?location=Austin",
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers,
  });
}

describe("verifyRequestAuth", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const result = await verifyRequestAuth(makeRequest());

    expect(result).toBeInstanceOf(Response);
    await expect((result as Response).json()).resolves.toEqual({
      detail: "Authentication required",
    });
    expect((result as Response).status).toBe(401);
  });

  it("returns verified user for a valid Bearer token", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "abc123",
      email: "user@example.com",
    });

    const result = await verifyRequestAuth(makeRequest(undefined, { Authorization: "Bearer valid-token" }));

    expect(result).toEqual({
      uid: "abc123",
      email: "user@example.com",
    });
    expect(verifyIdTokenMock).toHaveBeenCalledWith("valid-token");
  });

  it("returns 401 when token verification fails", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("expired"));

    const result = await verifyRequestAuth(makeRequest(undefined, { Authorization: "Bearer bad-token" }));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({
      detail: "Invalid or expired token",
    });
  });
});

describe("verifyRequestAppCheck", () => {
  beforeEach(() => {
    verifyAppCheckTokenMock.mockReset();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("skips verification when App Check is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "");

    const result = await verifyRequestAppCheck(makeRequest());

    expect(result).toBeNull();
    expect(verifyAppCheckTokenMock).not.toHaveBeenCalled();
  });

  it("requires App Check token in production when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "site-key");

    const result = await verifyRequestAppCheck(makeRequest());

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({
      detail: "App Check token required",
    });
  });

  it("accepts a valid App Check token", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "site-key");
    verifyAppCheckTokenMock.mockResolvedValue({ appId: "web-app" });

    const result = await verifyRequestAppCheck(
      makeRequest(undefined, { "X-Firebase-AppCheck": "valid-app-check" }),
    );

    expect(result).toBeNull();
    expect(verifyAppCheckTokenMock).toHaveBeenCalledWith("valid-app-check");
  });
});

describe("verifyApiRequest", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    verifyAppCheckTokenMock.mockReset();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns verified user when App Check is skipped and auth succeeds", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email: "a@b.com" });

    const result = await verifyApiRequest(
      makeRequest(undefined, { Authorization: "Bearer id-token" }),
    );

    expect(result).toEqual({ uid: "user-1", email: "a@b.com" });
  });
});

describe("isAppCheckEnforcementRequired", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true in production when site key is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "site-key");

    expect(isAppCheckEnforcementRequired()).toBe(true);
  });

  it("is false in development even when site key is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY", "site-key");

    expect(isAppCheckEnforcementRequired()).toBe(false);
  });
});
