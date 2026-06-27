import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chargeMock = vi.fn();
const verifyApiRequestMock = vi.fn();
const fetchBackendMock = vi.fn();

vi.mock("@/lib/mppx", () => ({
  mppx: {
    get charge() {
      return chargeMock;
    },
  },
}));

vi.mock("@/lib/server/auth", () => ({
  verifyApiRequest: (...args: unknown[]) => verifyApiRequestMock(...args),
}));

vi.mock("@/lib/server/backend-fetch", () => ({
  fetchBackend: (...args: unknown[]) => fetchBackendMock(...args),
}));

import { POST } from "../route";

function makePlanRequest(
  body: unknown,
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest("http://localhost:3000/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/plan", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", "http://backend.test");
    vi.stubEnv("SKIP_MPP", "true");
    chargeMock.mockReset();
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

    const response = await POST(makePlanRequest({ location: "Austin, TX" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      detail: "Authentication required",
    });
  });

  it("proxies directly to backend when SKIP_MPP is not false", async () => {
    const backendPayload = {
      itinerary: [],
      cited_path: "/plans/demo",
      filter_stats: {
        candidates_in: 1,
        candidates_out: 1,
        filter_method: "sdk",
        concept_name: "weekend_plan",
      },
    };

    fetchBackendMock.mockResolvedValue({
      ok: true,
      json: async () => backendPayload,
    });

    const response = await POST(
      makePlanRequest(
        {
          location: "Austin, TX",
          budget: 150,
          diet: "vegan",
          activities: "music",
        },
        { Authorization: "Bearer test-token" },
      ),
    );

    expect(chargeMock).not.toHaveBeenCalled();
    expect(fetchBackendMock).toHaveBeenCalledWith("/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      firebaseAuthHeader: "Bearer test-token",
      body: JSON.stringify({
        location: "Austin, TX",
        budget: 150,
        diet: "vegan",
        activities: "music",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendPayload);
  });

  it("uses mppx.charge wrapper when SKIP_MPP is false", async () => {
    vi.stubEnv("SKIP_MPP", "false");

    const backendPayload = {
      itinerary: [],
      cited_path: "/paid",
      filter_stats: {
        candidates_in: 1,
        candidates_out: 1,
        filter_method: "sdk",
        concept_name: "weekend_plan",
      },
    };

    fetchBackendMock.mockResolvedValue({
      ok: true,
      json: async () => backendPayload,
    });

    chargeMock.mockImplementation(() => (handler: (req: Request) => Response | Promise<Response>) =>
      handler,
    );

    const request = makePlanRequest({ location: "Denver, CO" });
    const response = await POST(request);

    expect(chargeMock).toHaveBeenCalledWith({ amount: "0.01" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendPayload);
  });

  it("returns 502 when backend is unreachable", async () => {
    fetchBackendMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await POST(makePlanRequest({ location: "Austin, TX" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.detail).toBe("Backend temporarily unavailable");
  });

  it("forwards backend error status and payload", async () => {
    fetchBackendMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Invalid plan request" }),
    });

    const response = await POST(makePlanRequest({ location: "Austin, TX" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      detail: "Invalid plan request",
    });
  });
});
