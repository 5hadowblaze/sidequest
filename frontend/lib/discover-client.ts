import type { CalendarSlot, DiscoverParams, DiscoverResponse, UserProfile } from "./types";

export class DiscoverError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "DiscoverError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function discoverQueryFromProfile(
  profile: UserProfile,
  calendarSlots: CalendarSlot[] = [],
): DiscoverParams {
  return {
    location: profile.homeCity,
    profile,
    calendarSlots,
  };
}

export async function fetchDiscoverEvents(
  params: DiscoverParams,
  signal?: AbortSignal,
): Promise<DiscoverResponse> {
  const searchParams = new URLSearchParams({
    location: params.location,
  });

  if (params.profile) {
    searchParams.set("budget", String(params.profile.budget));
    searchParams.set("diet", params.profile.diet);
    const activities = params.activities ?? params.profile.activities;
    if (activities?.trim()) {
      searchParams.set("activities", activities.trim());
    }
    if (params.profile.accessibility?.trim()) {
      searchParams.set("accessibility", params.profile.accessibility.trim());
    }
  }

  if (params.calendarSlots?.length) {
    searchParams.set("calendar_slots", JSON.stringify(params.calendarSlots));
  }

  const response = await fetch(`/api/discover?${searchParams.toString()}`, {
    signal,
  });

  const payload = (await response.json().catch(() => ({}))) as
    | DiscoverResponse
    | { detail?: string; message?: string };

  if (!response.ok) {
    const message =
      (payload as { detail?: string }).detail ??
      (payload as { message?: string }).message ??
      `Discover failed (${response.status})`;
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;
    throw new DiscoverError(
      message,
      response.status,
      retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
        ? retryAfterSeconds
        : undefined,
    );
  }

  return payload as DiscoverResponse;
}
