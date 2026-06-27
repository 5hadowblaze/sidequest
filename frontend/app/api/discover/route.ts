import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location?.trim()) {
    return Response.json(
      { detail: "location query parameter is required" },
      { status: 400 },
    );
  }

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
  const params = new URLSearchParams({ location: location.trim() });

  for (const key of ["budget", "diet", "activities", "accessibility", "calendar_slots"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  }

  try {
    const backendResponse = await fetch(
      `${backendUrl}/discover?${params.toString()}`,
      { next: { revalidate: 0 } },
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
    return Response.json(
      { detail: `Backend error: ${message}` },
      { status: 502 },
    );
  }
}
