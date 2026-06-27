import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyApiRequestMock = vi.fn();
const fetchBackendMock = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  verifyApiRequest: (...args: unknown[]) => verifyApiRequestMock(...args),
}));

vi.mock("@/lib/server/backend-fetch", () => ({
  fetchBackend: (...args: unknown[]) => fetchBackendMock(...args),
}));

import { GET } from "../route";

function makeDiscoverRequest(
  query: Record<string, string>,
  headers?: Record<string, string>,
): NextRequest {
  const params = new URLSearchParams(query);
  return new NextRequest(
    `http://localhost:3000/api/discover?${params}`,
    headers ? { headers } : undefined,
  );
}

describe("GET /api/discover", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", "http://backend.test");
    verifyApiRequestMock.mockResolvedValue({
      uid: "user-1",
      email: "user@example.com",
    });
    fetchBackendMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    verifyApiRequestMock.mockReset();
    fetchBackendMock.mockReset();
  });

  it("returns 401 when auth verification fails", async () => {
    verifyApiRequestMock.mockResolvedValue(
      Response.json({ detail: "Authentication required" }, { status: 401 }),
    );

    const response = await GET(makeDiscoverRequest({ location: "Austin, TX" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      detail: "Authentication required",
    });
  });

  it("returns 400 when location is missing", async () => {
    const response = await GET(makeDiscoverRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toBe("location query parameter is required");
  });

  it("returns 400 when location is blank", async () => {
    const response = await GET(makeDiscoverRequest({ location: "   " }));

    expect(response.status).toBe(400);
  });

  it("proxies discover request to backend with auth and forwarded params", async () => {
    const backendPayload = {
      location: "Austin, TX",
      events: [],
      source: "mock",
    };

    fetchBackendMock.mockResolvedValue({
      ok: true,
      json: async () => backendPayload,
    });

    const response = await GET(
      makeDiscoverRequest(
        {
          location: "Austin, TX",
          budget: "150",
          diet: "vegan",
          activities: "music",
          accessibility: "wheelchair",
          calendar_slots: JSON.stringify([
            { date: "2026-06-28", period: "morning" },
          ]),
        },
        { Authorization: "Bearer test-token" },
      ),
    );

    expect(fetchBackendMock).toHaveBeenCalledWith(
      expect.stringContaining("/discover?"),
      expect.objectContaining({
        firebaseAuthHeader: "Bearer test-token",
      }),
    );

    const calledUrl = fetchBackendMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("location=Austin%2C+TX");
    expect(calledUrl).toContain("budget=150");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendPayload);
  });

  it("returns 502 when backend is unreachable", async () => {
    fetchBackendMock.mockRejectedValue(new Error("Network down"));

    const response = await GET(makeDiscoverRequest({ location: "Austin, TX" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.detail).toBe("Backend temporarily unavailable");
  });

  it("forwards backend error status and payload", async () => {
    fetchBackendMock.mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "Retry-After": "30" }),
      json: async () => ({ detail: "Service unavailable" }),
    });

    const response = await GET(makeDiscoverRequest({ location: "Austin, TX" }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    await expect(response.json()).resolves.toEqual({
      detail: "Service unavailable",
    });
  });
});
