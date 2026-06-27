import type { PlanResult } from "./types";

const STORAGE_PREFIX = "sidequest-plan-confirmed";

export function planStorageKey(userId: string, planId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${planId}`;
}

export function getPlanClientId(result: PlanResult): string {
  return result.trace_id ?? result.client_id ?? "unknown";
}

export interface StoredPlanConfirmation {
  confirmed: boolean;
  draft: PlanResult;
  confirmedAt: string;
}

export function loadPlanConfirmation(
  userId: string,
  planId: string,
): StoredPlanConfirmation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(planStorageKey(userId, planId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlanConfirmation;
  } catch {
    return null;
  }
}

export function savePlanConfirmation(
  userId: string,
  planId: string,
  draft: PlanResult,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPlanConfirmation = {
      confirmed: true,
      draft,
      confirmedAt: new Date().toISOString(),
    };
    localStorage.setItem(planStorageKey(userId, planId), JSON.stringify(payload));
  } catch {
    // Ignore quota / private mode errors for demo
  }
}

export function clearPlanConfirmation(userId: string, planId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(planStorageKey(userId, planId));
  } catch {
    // ignore
  }
}
