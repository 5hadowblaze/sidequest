"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import BrandLogo from "@/components/BrandLogo";
import PipelineFlowPopover from "@/components/PipelineFlowPopover";
import DiscoverStatsHeader from "@/components/DiscoverStatsHeader";
import WelcomeSplash from "@/components/WelcomeSplash";
import EventCard from "@/components/EventCard";
import EventDetail from "@/components/EventDetail";
import ExplorerMap from "@/components/ExplorerMap";
import PlanResultsPanel from "@/components/PlanResultsPanel";
import ProfileOnboarding from "@/components/ProfileOnboarding";
import PrometheuxDiscoverLoading from "@/components/PrometheuxDiscoverLoading";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/lib/auth";
import { PipelinePhaseProvider } from "@/lib/pipeline-context";
import { loadCalendarSlots } from "@/lib/calendar";
import { discoverQueryFromProfile, DiscoverError, fetchDiscoverEvents } from "@/lib/discover-client";
import { planWeekend } from "@/lib/mppx-client";
import {
  clearPlanConfirmation,
  getPlanClientId,
  loadPlanConfirmation,
  savePlanConfirmation,
} from "@/lib/plan-confirmation";
import { getProfileStore, createDefaultProfile } from "@/lib/profile";
import { isDemoPresentationSource } from "@/lib/presentation";
import { loadSeedEvents, mergeDiscoverEvents } from "@/lib/seed-events";
import { QUICK_SEARCHES } from "@/lib/quick-searches";
import type {
  CalendarSlot,
  DiscoverEvent,
  FilterStats,
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
  const [mapCenter, setMapCenter] = useState({ lat: 51.5074, lng: -0.1278 });
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverSource, setDiscoverSource] = useState<string | null>(null);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
  const [activeQuickSearch, setActiveQuickSearch] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<PlannerStatus>("idle");
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanResult | null>(null);
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const discoverRequestId = useRef(0);
  const discoverListRef = useRef<HTMLDivElement>(null);
  const discoverAbortRef = useRef<AbortController | null>(null);
  const discoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef({
    user,
    profileLoading,
    profile,
    showOnboarding,
    discoverLoading,
    events,
    selectedId,
    planStatus,
    planResult,
    planDraft,
    planConfirmed,
  });

  useEffect(() => {
    stateRef.current = {
      user,
      profileLoading,
      profile,
      showOnboarding,
      discoverLoading,
      events,
      selectedId,
      planStatus,
      planResult,
      planDraft,
      planConfirmed,
    };
  });


  const homeCity = profile?.homeCity ?? "London";

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

  const applyDiscoverResult = useCallback(
    (
      data: Awaited<ReturnType<typeof fetchDiscoverEvents>>,
      seededEvents: DiscoverEvent[] = [],
    ) => {
      const merged = mergeDiscoverEvents(seededEvents, data.events);
      setEvents(merged);
      setDiscoverSource(
        seededEvents.length > 0 && data.events.length === 0
          ? "seed"
          : seededEvents.length > 0
            ? `${data.source}+seed`
            : data.source,
      );
      setFilterStats(data.filter_stats ?? null);
      if (data.center_lat != null && data.center_lng != null) {
        setMapCenter({ lat: data.center_lat, lng: data.center_lng });
      } else if (merged[0]) {
        setMapCenter({ lat: merged[0].lat, lng: merged[0].lng });
      }
      setSelectedId(null);
    },
    [],
  );

  const loadDiscover = useCallback(
    async (
      profileForDiscover: UserProfile,
      slots: CalendarSlot[],
      activitiesOverride?: string,
      uid?: string,
    ) => {
      discoverAbortRef.current?.abort();
      const controller = new AbortController();
      discoverAbortRef.current = controller;

      const requestId = ++discoverRequestId.current;
      setDiscoverLoading(true);
      setDiscoverError(null);
      setFilterStats(null);
      if (activitiesOverride) {
        setActiveQuickSearch(activitiesOverride);
      } else {
        setActiveQuickSearch(null);
      }

      try {
        const [data, seededEvents] = await Promise.all([
          fetchDiscoverEvents(
            {
              ...discoverQueryFromProfile(profileForDiscover, slots),
              activities: activitiesOverride,
            },
            controller.signal,
          ),
          uid ? loadSeedEvents(uid) : Promise.resolve([]),
        ]);
        if (requestId !== discoverRequestId.current) return;
        applyDiscoverResult(data, seededEvents);
      } catch (err) {
        if (requestId !== discoverRequestId.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof DiscoverError && err.status === 503) {
          const retryHint = err.retryAfterSeconds
            ? ` Try again in about ${err.retryAfterSeconds}s.`
            : " Wait a few seconds and try again.";
          setDiscoverError(
            `Prometheux is still filtering events.${retryHint}`,
          );
        } else {
          setDiscoverError(
            err instanceof Error ? err.message : "Failed to load events",
          );
        }
      } finally {
        if (requestId === discoverRequestId.current) {
          setDiscoverLoading(false);
        }
      }
    },
    [applyDiscoverResult],
  );

  const handleQuickSearch = useCallback(
    (activities: string) => {
      if (!profile?.onboardingComplete || discoverLoading) return;
      void loadDiscover(profile, calendarSlots, activities, user?.uid);
    },
    [profile, calendarSlots, discoverLoading, loadDiscover, user?.uid],
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
    void (async () => {
      const slots = await loadCalendarSlots(isMockAuth);
      if (!cancelled) {
        setCalendarSlots(slots);
        setCalendarLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, isMockAuth]);

  useEffect(() => {
    if (!profile?.homeCity || !profile.onboardingComplete || calendarLoading) {
      return;
    }

    if (discoverDebounceRef.current) {
      clearTimeout(discoverDebounceRef.current);
    }

    discoverDebounceRef.current = setTimeout(() => {
      void loadDiscover(profile, calendarSlots, undefined, user?.uid);
    }, 400);

    return () => {
      if (discoverDebounceRef.current) {
        clearTimeout(discoverDebounceRef.current);
      }
    };
  }, [profile, calendarSlots, calendarLoading, loadDiscover, user?.uid]);

  useEffect(() => {
    return () => {
      discoverAbortRef.current?.abort();
      if (discoverDebounceRef.current) {
        clearTimeout(discoverDebounceRef.current);
      }
    };
  }, []);

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
    setPlanDraft(null);
    setPlanConfirmed(false);
    setActivePlanId(null);

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
      const clientId =
        result.trace_id ??
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `plan-${Date.now()}`);
      const enriched: PlanResult = { ...result, client_id: clientId };
      const planId = getPlanClientId(enriched);

      setPlanResult(enriched);
      setActivePlanId(planId);

      const stored =
        user?.uid ? loadPlanConfirmation(user.uid, planId) : null;
      if (stored?.confirmed) {
        setPlanDraft(stored.draft);
        setPlanConfirmed(true);
      } else {
        setPlanDraft(enriched);
        setPlanConfirmed(false);
      }

      setPlanStatus("done");
    } catch (err) {
      setPlanStatus("error");
      setPlanError(err instanceof Error ? err.message : "Planning failed");
    }
  }

  function handleClosePlan() {
    setPlanResult(null);
    setPlanDraft(null);
    setPlanConfirmed(false);
    setActivePlanId(null);
    setPlanStatus("idle");
  }

  function handleConfirmPlan() {
    if (!planDraft) return;
    setPlanConfirmed(true);
    if (user?.uid && activePlanId) {
      savePlanConfirmation(user.uid, activePlanId, planDraft);
    }
  }

  function handleRestartPlanFlow() {
    if (user?.uid && activePlanId) {
      clearPlanConfirmation(user.uid, activePlanId);
    }
    setPlanResult(null);
    setPlanDraft(null);
    setPlanConfirmed(false);
    setActivePlanId(null);
    setPlanStatus("idle");
    setPlanError(null);
    setSelectedId(null);

    discoverListRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    if (profile?.onboardingComplete && !discoverLoading) {
      void loadDiscover(profile, calendarSlots, undefined, user?.uid);
    }
  }

  let content: ReactNode;

  if (authLoading) {
    content = <WelcomeSplash />;
  } else if (!user) {
    content = (
      <SignInScreen
        onSignIn={() => void signInWithGoogle()}
        error={signInError}
        loading={signInLoading}
      />
    );
  } else if (profileLoading) {
    content = <LoadingScreen message="Loading your profile…" />;
  } else {
    content = (
      <PipelinePhaseProvider discoverLoading={discoverLoading}>
        <div className="flex h-screen flex-col bg-background">
      <header className="z-30 flex shrink-0 items-center justify-between border-b border-border px-5 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <PipelineFlowPopover
            discoverLoading={discoverLoading}
            planStatus={planStatus}
          />
          <BrandLogo size={44} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Your weekend in {homeCity}
            </h1>
            <p className="mt-0.5 hidden text-sm text-muted sm:block">
              Curated events, pop-ups & experiences near you
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <UserMenu
            user={user}
            homeCity={profile?.homeCity}
            onSignOut={() => void signOut()}
            onEditProfile={() => setShowOnboarding(true)}
          />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative isolate h-[42vh] min-h-[280px] overflow-hidden md:min-h-[400px] lg:h-auto lg:min-h-[400px] lg:flex-[1.2]">
          <ExplorerMap
            events={events}
            center={mapCenter}
            selectedId={selectedId}
            onSelectEvent={setSelectedId}
          />
          {discoverLoading && (
            <PrometheuxDiscoverLoading variant="overlay" />
          )}
        </section>

        <aside className="relative flex min-h-0 flex-col border-t border-border bg-surface lg:w-[440px] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[480px]">
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
              <div className="shrink-0 border-b border-border px-5 py-5 md:px-6">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Discover
                </h2>

                <DiscoverStatsHeader
                  className="mt-3"
                  homeCity={homeCity}
                  chosenCount={discoverLoading ? null : events.length}
                  loading={discoverLoading}
                  filterStats={filterStats}
                />

                {!discoverLoading &&
                  ((discoverSource &&
                    !isDemoPresentationSource(discoverSource)) ||
                    calendarSlots.length > 0) && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-light">
                      {discoverSource &&
                        !isDemoPresentationSource(discoverSource) && (
                          <span>{discoverSource}</span>
                        )}
                      {calendarSlots.length > 0 && (
                        <span>
                          {discoverSource &&
                          !isDemoPresentationSource(discoverSource)
                            ? "· "
                            : ""}
                          {calendarSlots.length} free slot
                          {calendarSlots.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  )}

                {!discoverLoading && (
                  <QuickSearchChips
                    activeQuery={activeQuickSearch}
                    disabled={!profile?.onboardingComplete}
                    onSelect={handleQuickSearch}
                    className="mt-4"
                  />
                )}
              </div>

              <div
                ref={discoverListRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5"
              >
                {discoverLoading && (
                  <>
                    <PrometheuxDiscoverLoading variant="panel" />
                    <DiscoverSkeleton />
                  </>
                )}

                {discoverError && (
                  <p className="animate-fade-in mb-4 rounded-lg border border-coral-soft bg-coral-soft px-4 py-3 text-sm text-coral-deep">
                    {discoverError}
                  </p>
                )}

                {!discoverLoading && !discoverError && events.length === 0 && (
                  <p className="animate-fade-in py-16 text-center text-sm text-muted-light">
                    No events found yet — try a quick search above or update
                    your home city in preferences.
                  </p>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  {!discoverLoading &&
                    events.map((event, index) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        selected={selectedId === event.id}
                        onClick={() => setSelectedId(event.id)}
                        index={index}
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

      {planStatus === "done" && planDraft && (
        <PlanResultsPanel
          result={planDraft}
          eventTitle={selectedEvent?.title}
          confirmed={planConfirmed}
          onClose={handleClosePlan}
          onConfirm={handleConfirmPlan}
          onEdit={handleRestartPlanFlow}
        />
      )}
        </div>
      </PipelinePhaseProvider>
    );
  }

  return content;
}

function QuickSearchChips({
  onSelect,
  activeQuery,
  disabled,
  className = "",
}: {
  onSelect: (activities: string) => void;
  activeQuery: string | null;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {QUICK_SEARCHES.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip.activities)}
          className={`chip shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
            activeQuery === chip.activities ? "chip--active" : ""
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function SignInScreen({
  onSignIn,
  error,
  loading,
}: {
  onSignIn: () => void;
  error?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="bg-quest-gradient relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute right-5 top-5 md:right-8 md:top-6">
        <BrandLogo size={80} className="mx-auto" />
        <h1 className="mt-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          Welcome to Sidequest
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted">
          Discover local events, then let us plan the perfect weekend —
          personalized and verified.
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={onSignIn}
          className="btn-press mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-foreground py-3.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin-gentle rounded-full border-2 border-background/30 border-t-background" />
              Signing you in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p className="animate-fade-in mt-4 rounded-lg border border-coral-soft bg-coral-soft px-4 py-3 text-sm text-coral-deep">
            {error}
          </p>
        )}

      </div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="bg-quest-gradient flex min-h-screen items-center justify-center px-6">
      <div className="animate-fade-in flex flex-col items-center gap-4 text-muted">
        <div className="quest-spinner" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="animate-fade-in mb-5 space-y-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="skeleton aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
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
