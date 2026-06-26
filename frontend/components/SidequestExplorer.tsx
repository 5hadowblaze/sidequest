"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import EventCard from "@/components/EventCard";
import EventDetail from "@/components/EventDetail";
import ExplorerMap from "@/components/ExplorerMap";
import PlanResultsPanel from "@/components/PlanResultsPanel";
import ProfileOnboarding from "@/components/ProfileOnboarding";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/lib/auth";
import { loadCalendarSlots } from "@/lib/calendar";
import { discoverQueryFromProfile, fetchDiscoverEvents } from "@/lib/discover-client";
import { planWeekend } from "@/lib/mppx-client";
import { getProfileStore } from "@/lib/profile";
import type {
  CalendarSlot,
  DiscoverEvent,
  PlanResult,
  PlannerStatus,
  UserProfile,
} from "@/lib/types";

export default function SidequestExplorer() {
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signOut,
    isMockAuth,
    signInError,
    signInLoading,
  } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [events, setEvents] = useState<DiscoverEvent[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverSource, setDiscoverSource] = useState<string | null>(null);
  const [filterStats, setFilterStats] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<PlannerStatus>("idle");
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true);
    const store = getProfileStore();
    const saved = await store.getProfile(uid);
    setProfile(saved);
    setShowOnboarding(!saved?.onboardingComplete);
    setProfileLoading(false);
  }, []);

  const loadDiscover = useCallback(
    async (profileForDiscover: UserProfile, slots: CalendarSlot[]) => {
      setDiscoverLoading(true);
      setDiscoverError(null);
      try {
        const data = await fetchDiscoverEvents(
          discoverQueryFromProfile(profileForDiscover, slots),
        );
        setEvents(data.events);
        setDiscoverSource(data.source);
        if (data.filter_stats) {
          setFilterStats(
            `${data.filter_stats.candidates_in} → ${data.filter_stats.candidates_out} via ${data.filter_stats.filter_method}`,
          );
        } else {
          setFilterStats(null);
        }
        if (data.center_lat != null && data.center_lng != null) {
          setMapCenter({ lat: data.center_lat, lng: data.center_lng });
        } else if (data.events[0]) {
          setMapCenter({ lat: data.events[0].lat, lng: data.events[0].lng });
        }
        setSelectedId(null);
      } catch (err) {
        setDiscoverError(
          err instanceof Error ? err.message : "Failed to load events",
        );
      } finally {
        setDiscoverLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user?.uid) {
      void loadProfile(user.uid);
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [user?.uid, loadProfile]);

  useEffect(() => {
    if (!user) {
      setCalendarSlots([]);
      return;
    }

    let cancelled = false;
    setCalendarLoading(true);
    void loadCalendarSlots(isMockAuth).then((slots) => {
      if (!cancelled) {
        setCalendarSlots(slots);
        setCalendarLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, isMockAuth]);

  useEffect(() => {
    if (profile?.homeCity && profile.onboardingComplete && !calendarLoading) {
      void loadDiscover(profile, calendarSlots);
    }
  }, [profile, calendarSlots, calendarLoading, loadDiscover]);

  async function handleProfileComplete(next: UserProfile) {
    if (!user) return;
    const store = getProfileStore();
    await store.saveProfile(user.uid, next);
    setProfile(next);
    setShowOnboarding(false);
  }

  async function handlePlanWeekend(event: DiscoverEvent) {
    if (!profile) return;
    setPlanError(null);
    setPlanResult(null);

    const activities = [
      profile.activities,
      `Focus event: ${event.title} (${event.category})`,
      event.description.slice(0, 200),
    ].join(". ");

    try {
      const result = await planWeekend(
        {
          location: profile.homeCity,
          budget: profile.budget,
          diet: profile.diet,
          activities,
          accessibility: profile.accessibility,
          calendar_slots: calendarSlots,
        },
        () => setPlanStatus("planning"),
      );
      setPlanResult(result);
      setPlanStatus("done");
    } catch (err) {
      setPlanStatus("error");
      setPlanError(err instanceof Error ? err.message : "Planning failed");
    }
  }

  if (authLoading) {
    return <LoadingScreen message="Checking sign-in…" />;
  }

  if (!user) {
    return (
      <SignInScreen
        onSignIn={() => void signInWithGoogle()}
        isMockAuth={isMockAuth}
        error={signInError}
        loading={signInLoading}
      />
    );
  }

  if (profileLoading) {
    return <LoadingScreen message="Loading your profile…" />;
  }

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fa]">
      <header className="z-30 flex shrink-0 items-center justify-between border-b border-[#e8eaed] bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4285f4] via-[#34a853] to-[#fbbc04] text-sm font-bold text-white shadow-sm">
            S
          </div>
          <div>
            <h1 className="text-base font-medium text-[#202124] md:text-lg">
              Sidequest
            </h1>
            <p className="hidden text-xs text-[#80868b] sm:block">
              your weekend, verified
            </p>
          </div>
        </div>

        <UserMenu
          user={user}
          homeCity={profile?.homeCity}
          isMockAuth={isMockAuth}
          onSignOut={() => void signOut()}
          onEditProfile={() => setShowOnboarding(true)}
        />
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative h-[38vh] min-h-[240px] lg:h-auto lg:min-h-0 lg:flex-1">
          <ExplorerMap
            events={events}
            center={mapCenter}
            selectedId={selectedId}
            onSelectEvent={setSelectedId}
          />
        </section>

        <aside className="relative flex min-h-0 flex-col border-t border-[#e8eaed] bg-white lg:w-[420px] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[460px]">
          {selectedEvent ? (
            <EventDetail
              event={selectedEvent}
              onClose={() => setSelectedId(null)}
              onPlan={() => void handlePlanWeekend(selectedEvent)}
              planStatus={planStatus}
              planError={planError}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-[#e8eaed] px-5 py-4">
                <h2 className="text-lg font-medium text-[#202124]">
                  This weekend near {profile?.homeCity ?? "you"}
                </h2>
                <p className="mt-1 text-sm text-[#5f6368]">
                  Popups, festivals, conferences, pub hangouts & more
                  {discoverSource && (
                    <span className="ml-1 text-xs text-[#80868b]">
                      · via {discoverSource}
                      {filterStats ? ` · Prometheux ${filterStats}` : ""}
                      {calendarSlots.length > 0
                        ? ` · ${calendarSlots.length} free slots`
                        : ""}
                    </span>
                  )}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {discoverLoading && (
                  <div className="flex flex-col items-center gap-3 py-16 text-[#5f6368]">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#1a73e8] border-t-transparent" />
                    <p className="text-sm">Finding local events…</p>
                  </div>
                )}

                {discoverError && (
                  <p className="rounded-xl bg-[#fce8e6] px-4 py-3 text-sm text-[#c5221f]">
                    {discoverError}
                  </p>
                )}

                {!discoverLoading && !discoverError && events.length === 0 && (
                  <p className="py-12 text-center text-sm text-[#80868b]">
                    No events found. Try updating your home city in preferences.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      selected={selectedId === event.id}
                      onClick={() => setSelectedId(event.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showOnboarding && (
        <ProfileOnboarding
          initial={profile ?? undefined}
          onComplete={(p) => void handleProfileComplete(p)}
        />
      )}

      {planResult && (
        <PlanResultsPanel
          result={planResult}
          eventTitle={selectedEvent?.title}
          onClose={() => {
            setPlanResult(null);
            setPlanStatus("idle");
          }}
        />
      )}
    </div>
  );
}

function SignInScreen({
  onSignIn,
  isMockAuth,
  error,
  loading,
}: {
  onSignIn: () => void;
  isMockAuth: boolean;
  error?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#e8f0fe] to-white px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#e8eaed] bg-white p-10 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4285f4] via-[#34a853] to-[#fbbc04] text-xl font-bold text-white">
          S
        </div>
        <h1 className="mt-6 text-center text-2xl font-medium text-[#202124]">
          Sidequest
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-[#5f6368]">
          Your weekend, verified. Discover local events on the map, then plan
          with Prometheux and Tavily.
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={onSignIn}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white py-3.5 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4285f4] border-t-transparent" />
              Signing in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p className="mt-4 rounded-xl bg-[#fce8e6] px-4 py-3 text-sm text-[#c5221f]">
            {error}
          </p>
        )}

        {isMockAuth && (
          <p className="mt-4 text-center text-xs text-[#80868b]">
            Firebase not configured — demo sign-in uses local storage
          </p>
        )}
      </div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-3 text-[#5f6368]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1a73e8] border-t-transparent" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
