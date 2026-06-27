import { fetchWithAuth, requireAuthenticatedUser } from "./api-auth";
import type { PlanRequest, PlanResult } from "./types";

/**
 * Plans a weekend via the server-side API route.
 * MPP wallet signing stays server-side only (`frontend/lib/mppx.ts`).
 */
export async function planWeekend(
  request: PlanRequest,
  onStatus?: (status: "planning") => void,
): Promise<PlanResult> {
  requireAuthenticatedUser();
  onStatus?.("planning");

  const response = await fetchWithAuth("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | PlanResult
    | { detail?: string; message?: string; error?: string };

  if (!response.ok) {
    const message =
      (payload as { detail?: string }).detail ??
      (payload as { message?: string }).message ??
      (payload as { error?: string }).error ??
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as PlanResult;
}
