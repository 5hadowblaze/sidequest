import { NextRequest } from "next/server";

import { fetchBackend } from "@/lib/server/backend-fetch";
import { verifyApiRequest } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const authResult = await verifyApiRequest(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const location = request.nextUrl.searchParams.get("location");
  if (!location?.trim()) {
    return Response.json(
      { detail: "location query parameter is required" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({ location: location.trim() });

  for (const key of ["budget", "diet", "activities", "accessibility", "calendar_slots"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  }

  const authHeader = request.headers.get("Authorization");

  try {
    const backendResponse = await fetchBackend(
      `/discover?${params.toString()}`,
      {
        next: { revalidate: 0 },
        firebaseAuthHeader: authHeader,
      },
    );

    const data = await backendResponse.json().catch(() => ({
      detail: "Invalid JSON from backend",
    }));

    if (!backendResponse.ok) {
      const headers = new Headers();
      const retryAfter = backendResponse.headers.get("Retry-After");
      if (retryAfter) {
        headers.set("Retry-After", retryAfter);
      }
      return Response.json(data, { status: backendResponse.status, headers });
    }

    return Response.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend unreachable";
    console.error("Discover proxy error:", message);
    return Response.json(
      { detail: "Backend temporarily unavailable" },
      { status: 502 },
    );
  }
}
