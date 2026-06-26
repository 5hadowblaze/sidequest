import type { CalendarPeriod, CalendarSlot } from "./types";

const ACCESS_TOKEN_KEY = "sidequest-google-access-token";
const LEGACY_ACCESS_TOKEN_KEY = "weekend-explorer-google-access-token";

const PERIOD_WINDOWS: Record<
  CalendarPeriod,
  { startHour: number; endHour: number }
> = {
  morning: { startHour: 8, endHour: 12 },
  afternoon: { startHour: 12, endHour: 17 },
  evening: { startHour: 17, endHour: 22 },
};

interface BusyBlock {
  start: string;
  end: string;
}

interface FreeBusyResponse {
  calendars?: Record<string, { busy?: BusyBlock[] }>;
}

export function storeGoogleAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }
}

export function getGoogleAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) return token;

  const legacy = sessionStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
  if (legacy) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, legacy);
    sessionStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    return legacy;
  }
  return null;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Upcoming Saturday/Sunday dates for this weekend and next. */
export function getNextTwoWeekendDates(reference = new Date()): Date[] {
  const today = startOfDay(reference);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;

  const thisSaturday = addDays(today, daysUntilSaturday);
  const thisSunday = addDays(thisSaturday, 1);
  const nextSaturday = addDays(thisSaturday, 7);
  const nextSunday = addDays(nextSaturday, 1);

  return [thisSaturday, thisSunday, nextSaturday, nextSunday];
}

function dayToken(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  return weekday;
}

function periodWindow(date: Date, period: CalendarPeriod): { start: Date; end: Date } {
  const { startHour, endHour } = PERIOD_WINDOWS[period];
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);
  return { start, end };
}

function overlapsBusy(
  windowStart: Date,
  windowEnd: Date,
  busyBlocks: BusyBlock[],
): boolean {
  for (const block of busyBlocks) {
    const busyStart = new Date(block.start);
    const busyEnd = new Date(block.end);
    if (busyStart < windowEnd && busyEnd > windowStart) {
      return true;
    }
  }
  return false;
}

function deriveFreeSlotsFromBusy(
  weekendDates: Date[],
  busyBlocks: BusyBlock[],
): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const periods: CalendarPeriod[] = ["morning", "afternoon", "evening"];

  for (const date of weekendDates) {
    const token = dayToken(date);
    for (const period of periods) {
      const { start, end } = periodWindow(date, period);
      if (!overlapsBusy(start, end, busyBlocks)) {
        slots.push({ date: token, period });
      }
    }
  }

  return slots;
}

export async function fetchWeekendFreeSlots(
  accessToken: string,
): Promise<CalendarSlot[]> {
  const weekendDates = getNextTwoWeekendDates();
  const timeMin = startOfDay(weekendDates[0]).toISOString();
  const timeMax = addDays(startOfDay(weekendDates[weekendDates.length - 1]), 1).toISOString();

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Calendar free/busy failed (${response.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
    );
  }

  const payload = (await response.json()) as FreeBusyResponse;
  const busyBlocks = payload.calendars?.primary?.busy ?? [];
  return deriveFreeSlotsFromBusy(weekendDates, busyBlocks);
}

/** Demo slots when Firebase/calendar token is unavailable. */
export function mockWeekendFreeSlots(): CalendarSlot[] {
  return [
    { date: "saturday", period: "morning" },
    { date: "saturday", period: "afternoon" },
    { date: "saturday", period: "evening" },
    { date: "sunday", period: "morning" },
    { date: "sunday", period: "afternoon" },
  ];
}

export async function loadCalendarSlots(isMockAuth: boolean): Promise<CalendarSlot[]> {
  if (isMockAuth) {
    return mockWeekendFreeSlots();
  }

  const token = getGoogleAccessToken();
  if (!token) {
    return [];
  }

  try {
    return await fetchWeekendFreeSlots(token);
  } catch {
    return mockWeekendFreeSlots();
  }
}

export function formatRuleBadge(rule: string): string {
  const labels: Record<string, string> = {
    budget_ok: "Budget",
    loc_ok: "Location",
    diet_match: "Diet",
    activity_match: "Activities",
    access_match: "Access",
    slot_ok: "Schedule",
  };
  if (labels[rule]) return labels[rule];
  if (rule.startsWith("free_slot_")) {
    const parts = rule.replace("free_slot_", "").split("_");
    const period = parts.pop() ?? "";
    const day = parts.join(" ");
    return `Free ${day} ${period}`;
  }
  return rule.replace(/_/g, " ");
}
