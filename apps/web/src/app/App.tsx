import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { listTopics } from "../api/auth";
import {
  createCommunity as persistCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities
} from "../api/communities";
import { createPendingEvent, getEventDetail, listAllEvents, listUpcomingEvents, toggleEventInterest as persistEventInterest } from "../api/events";
import { uploadEventImage } from "../api/event-images";
import { createPost as persistPost, listPosts } from "../api/posts";
import { getMyProfile, uploadMyAvatar } from "../api/users";
import type { KreisUserProfile } from "../api/users";
import { AuthFlow } from "../components/auth/AuthFlow";
import { AuthViewport } from "../components/auth/AuthLayout";
import { ComposerModal } from "../components/composer/ComposerModal";
import { CommunitiesScreen } from "../components/communities/CommunitiesScreen";
import { EventDetailScreen } from "../components/events/EventDetailScreen";
import { EventsScreen } from "../components/events/EventsScreen";
import { PullToRefresh } from "../components/common/PullToRefresh";
import { SplashScreen, type SplashPhase } from "../components/common/SplashScreen";
import { ServiceWorkerUpdateBanner } from "../components/common/ServiceWorkerUpdateBanner";
import { StartupDebugPanel } from "../components/common/StartupDebugPanel";
import { ViewportDebugPanel } from "../components/common/ViewportDebugPanel";
import { HomeScreen } from "../components/home/HomeScreen";
import { BottomNav } from "../components/navigation/BottomNav";
import { Header } from "../components/navigation/Header";
import { ProfileScreen } from "../components/profile/ProfileScreen";
import type { ActivityPost, Community, ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput, EventLoadStatus, HomeTab, KreisEvent, KreisTopic, Screen, ThemeMode } from "../types";
import { useAuth } from "../auth/useAuth";
import { markStartup, measureStartup, updateStartupDebug } from "../startup/startup-debug";
import { cn } from "../utils/cn";
import { scrollTop } from "../utils/navigation";
import { normalize } from "../utils/text";

const themeStorageKey = "kreis-theme-mode-v2";
const splashMinimumDurationMs = 2_180;
const screenRoutes: Record<Screen, string> = {
  home: "/",
  events: "/events",
  communities: "/communities",
  profile: "/profile"
};
const eventDetailRoutePrefix = `${screenRoutes.events}/`;
const routeScreens = Object.fromEntries(
  Object.entries(screenRoutes).map(([screen, path]) => [path, screen])
) as Partial<Record<string, Screen>>;

function normalizeRoute(pathname: string): string {
  if (pathname === "/") return pathname;

  return pathname.replace(/\/+$/, "");
}

function getEventDetailId(pathname: string): string | null {
  if (!pathname.startsWith(eventDetailRoutePrefix)) return null;

  const eventId = pathname.slice(eventDetailRoutePrefix.length);
  if (!eventId) return null;

  try {
    return decodeURIComponent(eventId);
  } catch {
    return eventId;
  }
}

function getComposerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No pudimos completar la solicitud. Intenta nuevamente.";
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";

  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    return "light";
  }

  return "light";
}

function useStartupSplash(authStatus: string): {
  visible: boolean;
  phase: SplashPhase;
  handleExitComplete: () => void;
} {
  const [minimumFinished, setMinimumFinished] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("intro");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMinimumFinished(true);
      markStartup("splash-minimum-finished");
    }, splashMinimumDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    updateStartupDebug({ splashPhase: phase });
  }, [phase]);

  useEffect(() => {
    if (!visible) return;
    if (phase === "exiting") return;

    if (!minimumFinished) return;

    const nextPhase: SplashPhase = authStatus === "initializing" ? "holding" : "exiting";
    if (phase === nextPhase) return;

    const frameId = window.requestAnimationFrame(() => {
      if (nextPhase === "exiting") markStartup("splash-exit-start");
      setPhase(nextPhase);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [authStatus, minimumFinished, phase, visible]);

  return {
    visible,
    phase,
    handleExitComplete: () => {
      setVisible(false);
      measureStartup("splash-exit", "splash-exit-start", "splash-exit-end");
    }
  };
}

function AuthRecoveryScreen() {
  const { error, retryInitialization, continueWithoutSession } = useAuth();

  return (
    <AuthViewport>
      <section className="grid h-full min-h-dvh place-items-center bg-kreis-forest px-6 text-center text-kreis-cream">
        <div className="w-full max-w-[330px]">
          <h1 className="m-0 font-sans text-[26px] font-medium leading-tight">No pudimos recuperar tu sesion.</h1>
          <p className="mt-3 mb-0 text-[15px] leading-snug text-[rgba(247,237,218,0.68)]">
            {error ?? "Reintentá o entrá sin sesion para volver al inicio."}
          </p>
          <div className="mt-6 grid gap-3">
            <button className="h-[42px] rounded-[16px] border-0 bg-kreis-cream text-[16px] font-medium text-kreis-forest" type="button" onClick={() => void retryInitialization()}>
              Reintentar
            </button>
            <button className="h-[42px] rounded-[16px] border-0 bg-[rgba(247,237,218,0.16)] text-[16px] font-medium text-kreis-cream" type="button" onClick={() => void continueWithoutSession()}>
              Continuar sin sesion
            </button>
          </div>
        </div>
      </section>
    </AuthViewport>
  );
}

function UnauthenticatedApp() {
  return (
    <AuthViewport>
      <AuthFlow />
    </AuthViewport>
  );
}

export default function App() {
  const { status, session } = useAuth();
  const splash = useStartupSplash(status);

  return (
    <>
      <ViewportDebugPanel />
      <StartupDebugPanel />
      <ServiceWorkerUpdateBanner />
      {status === "authenticated" && session ? (
        <AuthenticatedApp session={session} />
      ) : status === "recovery-error" ? (
        <AuthRecoveryScreen />
      ) : (
        <UnauthenticatedApp />
      )}
      {splash.visible ? <SplashScreen phase={splash.phase} onExitComplete={splash.handleExitComplete} /> : null}
    </>
  );
}

function AuthenticatedApp({ session }: { session: Session }) {
  const { signOut } = useAuth();
  const accessToken = session.access_token;
  const profileEmail = session.user.email;
  const [events, setEvents] = useState<KreisEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<KreisEvent[]>([]);
  const [eventLoadStatus, setEventLoadStatus] = useState<EventLoadStatus>("loading");
  const [eventReloadKey, setEventReloadKey] = useState(0);
  const [eventTopics, setEventTopics] = useState<KreisTopic[]>([]);
  const [eventTopicsStatus, setEventTopicsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [eventTopicsReloadKey, setEventTopicsReloadKey] = useState(0);
  const [userProfile, setUserProfile] = useState<KreisUserProfile | null>(null);
  const [profileLoadStatus, setProfileLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activity, setActivity] = useState<ActivityPost[]>([]);
  const [homeTab, setHomeTab] = useState<HomeTab>("events");
  const [eventFilter, setEventFilter] = useState("Todos");
  const [globalQuery, setGlobalQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("post");
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const location = useLocation();
  const routerNavigate = useNavigate();
  const activeRoute = normalizeRoute(location.pathname);
  const eventDetailId = getEventDetailId(activeRoute);
  const activeEvent = eventDetailId ? events.find((event) => event.id === eventDetailId) : undefined;
  const isEventDetail = Boolean(eventDetailId);
  const screen = isEventDetail ? "events" : routeScreens[activeRoute] ?? "home";

  const query = normalize(globalQuery.trim());
  const matchesQuery = (text: string): boolean => !query || normalize(text).includes(query);

  const eventCategories = ["Todos", ...eventTopics.map((topic) => topic.name)];

  const homeEvents = upcomingEvents.filter((event) => matchesQuery(`${event.title} ${event.category} ${event.place} ${event.description}`));

  const visibleEvents = events.filter((event) => {
    const queryMatch = matchesQuery(`${event.title} ${event.category} ${event.place} ${event.description}`);
    const categoryMatch = eventFilter === "Todos" || event.topics.some((topic) => normalize(topic.name) === normalize(eventFilter));
    return queryMatch && categoryMatch;
  });

  const visibleCommunities = communities.filter((community) => {
    return matchesQuery(`${community.name} ${community.category} ${community.pulse} ${community.description ?? ""}`);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.dataset.theme = themeMode;

    try {
      window.localStorage.setItem(themeStorageKey, themeMode);
    } catch {
      // Theme persistence is nice to have, but the UI can still work without storage.
    }
  }, [themeMode]);

  useEffect(() => {
    markStartup("app-shell-mounted");
    updateStartupDebug({ appShellMounted: true });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      listUpcomingEvents(accessToken, controller.signal),
      listAllEvents(accessToken, controller.signal)
    ])
      .then(([nextUpcomingEvents, nextEvents]) => {
        setUpcomingEvents(nextUpcomingEvents);
        setEvents(nextEvents);
        setEventLoadStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setEventLoadStatus("error");
      });

    return () => controller.abort();
  }, [accessToken, eventReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      listCommunities(accessToken, controller.signal),
      listPosts(accessToken, controller.signal)
    ])
      .then(([nextCommunities, nextPosts]) => {
        setCommunities(nextCommunities);
        setActivity(nextPosts);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCommunities([]);
          setActivity([]);
        }
      });

    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();

    void listTopics(controller.signal)
      .then((topics) => {
        setEventTopics(topics.map((topic) => ({
          id: topic.id_topico,
          name: topic.topico
        })));
        setEventTopicsStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEventTopics([]);
          setEventTopicsStatus("error");
        }
      });

    return () => controller.abort();
  }, [eventTopicsReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    void getMyProfile(accessToken, controller.signal)
      .then((profile) => {
        setUserProfile(profile);
        setProfileLoadStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileLoadStatus("error");
      });

    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!eventDetailId) return;

    const controller = new AbortController();

    void getEventDetail(eventDetailId, accessToken, controller.signal)
      .then((event) => {
        setEvents((items) => items.map((item) => item.id === event.id ? event : item));
        setUpcomingEvents((items) => items.map((item) => item.id === event.id ? event : item));
      })
      .catch(() => {
        // The summary still lets the detail screen render if the expanded request fails.
      });

    return () => controller.abort();
  }, [accessToken, eventDetailId]);

  useEffect(() => {
    if (routeScreens[activeRoute]) return;

    if (eventDetailId) {
      if (activeEvent) return;
      if (eventLoadStatus === "loading") return;

      routerNavigate(screenRoutes.events, { replace: true });
      return;
    }

    routerNavigate(screenRoutes.home, { replace: true });
  }, [activeEvent, activeRoute, eventDetailId, eventLoadStatus, routerNavigate]);

  useEffect(() => {
    scrollTop();
  }, [activeRoute]);

  function navigate(nextScreen: Screen): void {
    routerNavigate(screenRoutes[nextScreen]);
    scrollTop();
  }

  function openEventsFromHome(): void {
    setEventFilter("Todos");
    navigate("events");
  }

  function retryEvents(): void {
    setEventLoadStatus("loading");
    setEventReloadKey((current) => current + 1);
  }

  function openEventDetails(eventId: string): void {
    routerNavigate(`${screenRoutes.events}/${encodeURIComponent(eventId)}`);
    scrollTop();
  }

  function closeEventDetails(): void {
    routerNavigate(screenRoutes.events);
    scrollTop();
  }

  function toggleTheme(): void {
    setThemeMode((current) => current === "dark" ? "light" : "dark");
  }

  function logoutUser(): void {
    void signOut().catch(() => undefined);
    setUserProfile(null);
    setProfileLoadStatus("loading");
    setEvents([]);
    setUpcomingEvents([]);
    setCommunities([]);
    setActivity([]);
    setEventLoadStatus("loading");
    setComposerOpen(false);
    routerNavigate(screenRoutes.home, { replace: true });
  }

  async function uploadProfileAvatar(file: File): Promise<void> {
    const nextProfile = await uploadMyAvatar(accessToken, file);
    setUserProfile(nextProfile);
  }

  function reloadEventTopics(): void {
    setEventTopicsStatus("loading");
    setEventTopicsReloadKey((current) => current + 1);
  }

  function openComposer(mode: ComposerMode): void {
    setComposerMode(mode);
    setComposerError(null);
    if ((mode === "event" || mode === "community") && !eventTopics.length) reloadEventTopics();
    setComposerOpen(true);
  }

  function closeComposer(): void {
    if (composerSubmitting) return;

    setComposerError(null);
    setComposerOpen(false);
  }

  function retryEventTopics(): void {
    reloadEventTopics();
  }

  function toggleJoin(communityId: string): void {
    const community = communities.find((item) => item.id === communityId);
    if (!community) return;

    const previousJoined = community.joined;
    const previousMembers = community.members;

    setCommunities((items) => items.map((item) => item.id === communityId
      ? {
          ...item,
          joined: !previousJoined,
          members: Math.max(0, previousMembers + (previousJoined ? -1 : 1))
        }
      : item));

    const membershipRequest = previousJoined
      ? leaveCommunity(communityId, accessToken)
      : joinCommunity(communityId, accessToken);

    void membershipRequest
      .then((membership) => {
        setCommunities((items) => items.map((item) => item.id === communityId
          ? {
              ...item,
              joined: membership.joined,
              members: membership.miembros
            }
          : item));

        if (!membership.joined) {
          setActivity((items) => items.filter((post) => post.communityId !== communityId));
        } else {
          void listPosts(accessToken).then(setActivity).catch(() => undefined);
        }
      })
      .catch(() => {
        setCommunities((items) => items.map((item) => item.id === communityId
          ? {
              ...item,
              joined: previousJoined,
              members: previousMembers
            }
          : item));
      });
  }

  function updateEventInterest(eventId: string, interested: boolean): void {
    setEvents((items) => items.map((event) => event.id === eventId ? { ...event, interested } : event));
    setUpcomingEvents((items) => items.map((event) => event.id === eventId ? { ...event, interested } : event));
  }

  function updatePostCommentCount(postId: string, total: number): void {
    setActivity((items) => items.map((post) => post.id === postId
      ? {
          ...post,
          comments: total
        }
      : post));
  }

  function toggleEventInterest(eventId: string): void {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    const previousInterest = event.interested;
    updateEventInterest(eventId, !previousInterest);

    void persistEventInterest(eventId, accessToken)
      .then((interested) => updateEventInterest(eventId, interested))
      .catch(() => updateEventInterest(eventId, previousInterest));
  }

  function createCommunity({ name, description, topicIds }: CreateCommunityInput): void {
    if (!name || !description || !topicIds.length) return;

    setComposerSubmitting(true);
    setComposerError(null);

    void persistCommunity({ name, description, topicIds }, accessToken)
      .then((community) => {
        setCommunities((items) => [community, ...items]);
        setComposerOpen(false);
      })
      .catch((error) => {
        setComposerError(getComposerErrorMessage(error));
      })
      .finally(() => setComposerSubmitting(false));
  }

  function createEvent({ title, date, place, topicIds, description, coverFile }: CreateEventInput): void {
    if (!title || !date || !place || !topicIds.length || !description) return;

    setComposerSubmitting(true);
    setComposerError(null);

    void (async () => {
      const imageUrl = coverFile ? await uploadEventImage(coverFile, accessToken) : undefined;

      await createPendingEvent({ title, date, place, topicIds, description, imageUrl }, accessToken);
    })()
      .then(() => {
        setHomeTab("events");
        setComposerOpen(false);
        setEventLoadStatus("loading");
        setEventReloadKey((current) => current + 1);
        navigate("events");
      })
      .catch((error) => {
        console.error("Create event failed", error);
        setComposerError(getComposerErrorMessage(error));
      })
      .finally(() => setComposerSubmitting(false));
  }

  function createPost({ communityId, postText }: CreatePostInput): void {
    if (!communityId || !postText) return;

    setComposerSubmitting(true);
    setComposerError(null);

    void persistPost(communityId, postText, accessToken)
      .then((post) => {
        setActivity((items) => [post, ...items]);
        setComposerOpen(false);
      })
      .catch((error) => {
        setComposerError(getComposerErrorMessage(error));
      })
      .finally(() => setComposerSubmitting(false));
  }

  async function refreshAppData(): Promise<void> {
    const [
      upcomingEventsResult,
      eventsResult,
      communitiesResult,
      postsResult,
      profileResult,
      topicsResult,
      eventDetailResult
    ] = await Promise.allSettled([
      listUpcomingEvents(accessToken),
      listAllEvents(accessToken),
      listCommunities(accessToken),
      listPosts(accessToken),
      getMyProfile(accessToken),
      listTopics(),
      eventDetailId ? getEventDetail(eventDetailId, accessToken) : Promise.resolve(null)
    ]);

    if (upcomingEventsResult.status === "fulfilled") setUpcomingEvents(upcomingEventsResult.value);
    if (eventsResult.status === "fulfilled") {
      setEvents(() => {
        if (eventDetailResult.status !== "fulfilled" || !eventDetailResult.value) return eventsResult.value;

        return eventsResult.value.map((item) => item.id === eventDetailResult.value?.id ? eventDetailResult.value : item);
      });
    }
    if (upcomingEventsResult.status === "fulfilled" && eventsResult.status === "fulfilled") {
      setEventLoadStatus("ready");
    }
    if (communitiesResult.status === "fulfilled") setCommunities(communitiesResult.value);
    if (postsResult.status === "fulfilled") setActivity(postsResult.value);
    if (profileResult.status === "fulfilled") {
      setUserProfile(profileResult.value);
      setProfileLoadStatus("ready");
    }
    if (topicsResult.status === "fulfilled") {
      setEventTopics(topicsResult.value.map((topic) => ({
        id: topic.id_topico,
        name: topic.topico
      })));
      setEventTopicsStatus("ready");
    }
    if (eventDetailResult.status === "fulfilled" && eventDetailResult.value) {
      setUpcomingEvents((items) => items.map((item) => item.id === eventDetailResult.value?.id ? eventDetailResult.value : item));
    }

    const failed = [upcomingEventsResult, eventsResult, communitiesResult, postsResult, profileResult, topicsResult, eventDetailResult]
      .some((result) => result.status === "rejected");

    if (failed) {
      throw new Error("Refresh failed");
    }
  }

  return (
    <>
      <PullToRefresh disabled={composerOpen} onRefresh={refreshAppData} />
      <div
        className={cn(
          "app-shell mx-auto min-h-screen min-h-dvh w-[min(100%,1120px)] overflow-x-hidden md:px-6",
          isEventDetail ? "pb-0" : "pb-[var(--bottom-nav-clearance)]"
        )}
      >
            {screen !== "profile" && screen !== "home" && screen !== "events" && screen !== "communities" ? (
              <Header
                globalQuery={globalQuery}
                themeMode={themeMode}
                onQueryChange={setGlobalQuery}
                onToggleTheme={toggleTheme}
              />
            ) : null}

            <main className={cn(screen === "home" || isEventDetail ? "px-0" : "px-[var(--page-gutter)] md:px-0")} tabIndex={-1}>
              {isEventDetail && activeEvent && (
                <EventDetailScreen
                  event={activeEvent}
                  onBack={closeEventDetails}
                  onToggleInterest={toggleEventInterest}
                />
              )}
              {!isEventDetail && screen === "home" && (
                <HomeScreen
                  events={homeEvents}
                  eventLoadStatus={eventLoadStatus}
                  communities={visibleCommunities}
                  profileTopics={userProfile?.topics ?? []}
                  homeTab={homeTab}
                  themeMode={themeMode}
                  onHomeTab={setHomeTab}
                  onOpenEvents={openEventsFromHome}
                  onOpenEventDetails={openEventDetails}
                  onRetryEvents={retryEvents}
                  onToggleTheme={toggleTheme}
                  onToggleJoin={toggleJoin}
                />
              )}
              {!isEventDetail && screen === "events" && (
                <EventsScreen
                  events={visibleEvents}
                  eventLoadStatus={eventLoadStatus}
                  eventFilter={eventFilter}
                  eventCategories={eventCategories}
                  searchQuery={globalQuery}
                  themeMode={themeMode}
                  onFilter={setEventFilter}
                  onSearchChange={setGlobalQuery}
                  onCreateEvent={() => openComposer("event")}
                  onOpenEventDetails={openEventDetails}
                  onRetryEvents={retryEvents}
                  onToggleTheme={toggleTheme}
                />
              )}
              {!isEventDetail && screen === "communities" && (
                <CommunitiesScreen
                  accessToken={accessToken}
                  communities={communities}
                  posts={activity}
                  themeMode={themeMode}
                  onCreateCommunity={() => openComposer("community")}
                  onCreatePost={() => openComposer("post")}
                  onCommentCountChange={updatePostCommentCount}
                  onToggleTheme={toggleTheme}
                />
              )}
              {!isEventDetail && screen === "profile" && (
                <ProfileScreen
                  communities={communities}
                  events={events}
                  profile={userProfile}
                  profileEmail={profileEmail}
                  profileLoadStatus={profileLoadStatus}
                  themeMode={themeMode}
                  onOpenEventDetails={openEventDetails}
                  onToggleTheme={toggleTheme}
                  onUploadAvatar={uploadProfileAvatar}
                  onLogout={logoutUser}
                />
              )}
            </main>

            <ComposerModal
              open={composerOpen}
              mode={composerMode}
              communities={communities}
              eventTopics={eventTopics}
              eventTopicsStatus={eventTopicsStatus}
              submitting={composerSubmitting}
              error={composerError}
              onClose={closeComposer}
              onRetryEventTopics={retryEventTopics}
              onCreateCommunity={createCommunity}
              onCreateEvent={createEvent}
              onCreatePost={createPost}
            />
      </div>
      {!isEventDetail && <BottomNav screen={screen} onNavigate={navigate} />}
    </>
  );
}

