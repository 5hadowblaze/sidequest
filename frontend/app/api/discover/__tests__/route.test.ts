import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

function makeDiscoverRequest(query: Record<string, string>): NextRequest {
  const params = new URLSearchParams(query);
  return new NextRequest(`http://localhost:3000/api/discover?${params}`);
}

describe("GET /api/discover", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", "http://backend.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

  it("proxies discover request to backend with forwarded params", async () => {
    const backendPayload = {
      location: "Austin, TX",
      events: [],
      source: "mock",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendPayload,
      }),
    );

    const response = await GET(
      makeDiscoverRequest({
        location: "Austin, TX",
        budget: "150",
        diet: "vegan",
        activities: "music",
        accessibility: "wheelchair",
        calendar_slots: JSON.stringify([
          { date: "2026-06-28", period: "morning" },
        ]),
      }),
    );

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("http://backend.test/discover?");
    expect(calledUrl).toContain("location=Austin%2C+TX");
    expect(calledUrl).toContain("budget=150");
    expect(calledUrl).toContain("diet=vegan");
    expect(calledUrl).toContain("activities=music");
    expect(calledUrl).toContain("accessibility=wheelchair");
    expect(calledUrl).toContain("calendar_slots=");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendPayload);
  });

  it("returns 502 when backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down")),
    );

    const response = await GET(makeDiscoverRequest({ location: "Austin, TX" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.detail).toContain("Backend error");
    expect(body.detail).toContain("Network down");
  });

  it("forwards backend error status and payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "Retry-After": "30" }),
        json: async () => ({ detail: "Service unavailable" }),
      }),
    );

    const response = await GET(makeDiscoverRequest({ location: "Austin, TX" }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    await expect(response.json()).resolves.toEqual({
      detail: "Service unavailable",
    });
  });
});
