import { NextRequest } from "next/server";

import { mppx } from "@/lib/mppx";
import { fetchBackend } from "@/lib/server/backend-fetch";
import { verifyApiRequest } from "@/lib/server/auth";

/** MPP is scaffolded only — skipped by default for hackathon demos. Set SKIP_MPP=false to enable. */
function isMppEnabled(): boolean {
  return process.env.SKIP_MPP === "false";
}

async function proxyToBackend(request: NextRequest): Promise<Response> {
  const body = await request.text();
  const authHeader = request.headers.get("Authorization");

  let backendResponse: Response;
  try {
    backendResponse = await fetchBackend("/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      firebaseAuthHeader: authHeader,
      body,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend unreachable";
    console.error("Plan proxy error:", message);
    return Response.json(
      { detail: "Backend temporarily unavailable" },
      { status: 502 },
    );
  }

  const data = await backendResponse.json().catch(() => ({
    detail: "Invalid JSON from backend",
  }));

  if (!backendResponse.ok) {
    return Response.json(data, { status: backendResponse.status });
  }

  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const authResult = await verifyApiRequest(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  if (!isMppEnabled()) {
    return proxyToBackend(request);
  }

  const paidPost = mppx.charge({ amount: "0.01" })((req: Request) =>
    proxyToBackend(req as NextRequest),
  );

  return paidPost(request);
}
