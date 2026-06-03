import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { listTopics, logout } from "../api/auth";
import type { AuthResult } from "../api/auth";
import { createPendingEvent, getEventDetail, listAllEvents, listUpcomingEvents, toggleEventInterest as persistEventInterest } from "../api/events";
import { getMyProfile } from "../api/users";
import type { KreisUserProfile } from "../api/users";
import { AuthFlow } from "../components/auth/AuthFlow";
import { ComposerModal } from "../components/composer/ComposerModal";
import { CommunitiesScreen } from "../components/communities/CommunitiesScreen";
import { EventDetailScreen } from "../components/events/EventDetailScreen";
import { EventsScreen } from "../components/events/EventsScreen";
import { SplashScreen } from "../components/common/SplashScreen";
import { HomeScreen } from "../components/home/HomeScreen";
import { BottomNav } from "../components/navigation/BottomNav";
import { Header } from "../components/navigation/Header";
import { ProfileScreen } from "../components/profile/ProfileScreen";
import { initialActivity, initialCommunities } from "../data/mockData";
import type { ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput, EventLoadStatus, HomeTab, KreisEvent, KreisTopic, Screen, ThemeMode } from "../types";
import { cn } from "../utils/cn";
import { scrollTop } from "../utils/navigation";
import { normalize } from "../utils/text";

const themeStorageKey = "kreis-theme-mode-v2";
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

export default function App() {
  const [authSession, setAuthSession] = useState<AuthResult | null>(null);
  const [events, setEvents] = useState<KreisEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<KreisEvent[]>([]);
  const [eventLoadStatus, setEventLoadStatus] = useState<EventLoadStatus>("loading");
  const [eventReloadKey, setEventReloadKey] = useState(0);
  const [eventTopics, setEventTopics] = useState<KreisTopic[]>([]);
  const [eventTopicsStatus, setEventTopicsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [eventTopicsReloadKey, setEventTopicsReloadKey] = useState(0);
  const [userProfile, setUserProfile] = useState<KreisUserProfile | null>(null);
  const [profileLoadStatus, setProfileLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [communities, setCommunities] = useState(initialCommunities);
  const [activity, setActivity] = useState(initialActivity);
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

  const discoverCommunities = communities.filter((community) => {
    return !community.joined && matchesQuery(`${community.name} ${community.category} ${community.pulse} ${community.description ?? ""}`);
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
    const accessToken = authSession?.session.access_token;
    if (!accessToken) return;

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
  }, [authSession, eventReloadKey]);

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
    const accessToken = authSession?.session.access_token;
    if (!accessToken) return;

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
  }, [authSession]);

  useEffect(() => {
    const accessToken = authSession?.session.access_token;
    if (!eventDetailId || !accessToken) return;

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
  }, [authSession, eventDetailId]);

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
    void logout().catch(() => undefined);
    setAuthSession(null);
    setUserProfile(null);
    setProfileLoadStatus("loading");
    setEvents([]);
    setUpcomingEvents([]);
    setEventLoadStatus("loading");
    setComposerOpen(false);
    routerNavigate(screenRoutes.home, { replace: true });
  }

  function reloadEventTopics(): void {
    setEventTopicsStatus("loading");
    setEventTopicsReloadKey((current) => current + 1);
  }

  function openComposer(mode: ComposerMode): void {
    setComposerMode(mode);
    setComposerError(null);
    if (mode === "event" && !eventTopics.length) reloadEventTopics();
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
    setCommunities((items) => items.map((community) => community.id === communityId ? { ...community, joined: !community.joined } : community));
  }

  function updateEventInterest(eventId: string, interested: boolean): void {
    setEvents((items) => items.map((event) => event.id === eventId ? { ...event, interested } : event));
    setUpcomingEvents((items) => items.map((event) => event.id === eventId ? { ...event, interested } : event));
  }

  function toggleEventInterest(eventId: string): void {
    const accessToken = authSession?.session.access_token;
    const event = events.find((item) => item.id === eventId);
    if (!accessToken || !event) return;

    const previousInterest = event.interested;
    updateEventInterest(eventId, !previousInterest);

    void persistEventInterest(eventId, accessToken)
      .then((interested) => updateEventInterest(eventId, interested))
      .catch(() => updateEventInterest(eventId, previousInterest));
  }

  function createCommunity({ name, category }: CreateCommunityInput): void {
    if (!name || !category) return;

    setCommunities((items) => [
      {
        id: `community-${Date.now()}`,
        name,
        members: 1,
        category,
        icon: name.slice(0, 2).toUpperCase(),
        joined: true,
        recommended: true,
        popular: false,
        pulse: "Comunidad recien creada",
        description: "Un nuevo espacio para reunir estudiantes con intereses y planes en comun."
      },
      ...items
    ]);
    setComposerOpen(false);
  }

  function createEvent({ title, date, place, topicIds, description }: CreateEventInput): void {
    if (!title || !date || !place || !topicIds.length || !description) return;

    const accessToken = authSession?.session.access_token;
    if (!accessToken) return;

    setComposerSubmitting(true);
    setComposerError(null);

    void createPendingEvent({ title, date, place, topicIds, description }, accessToken)
      .then(() => {
        setHomeTab("events");
        setComposerOpen(false);
        navigate("events");
      })
      .catch(() => setComposerError("No pudimos enviar el evento. Intentá nuevamente."))
      .finally(() => setComposerSubmitting(false));
  }

  function createPost({ communityId, postText }: CreatePostInput): void {
    const community = communities.find((item) => item.id === communityId);

    if (community && postText) {
      setActivity((items) => [
        {
          id: `post-${Date.now()}`,
          communityId: community.id,
          communityName: community.name,
          icon: community.icon,
          author: "Nico",
          time: "ahora",
          title: "Nuevo post",
          text: postText,
          score: 1,
          comments: 0
        },
        ...items
      ]);
    }

    setComposerOpen(false);
  }

  return (
    <>
      <SplashScreen />
      {authSession ? (
        <>
          <div
            className={cn(
              "app-shell mx-auto min-h-screen min-h-dvh w-[min(100%,1120px)] overflow-x-hidden md:px-6",
              isEventDetail ? "pb-0" : "pb-[var(--bottom-nav-clearance)]"
            )}
          >
            {screen !== "profile" && screen !== "home" && screen !== "events" ? (
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
                  communities={discoverCommunities}
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
              {!isEventDetail && screen === "communities" && <CommunitiesScreen communities={communities} discover={discoverCommunities} posts={activity} onToggleJoin={toggleJoin} />}
              {!isEventDetail && screen === "profile" && (
                <ProfileScreen
                  profile={userProfile}
                  profileLoadStatus={profileLoadStatus}
                  themeMode={themeMode}
                  onToggleTheme={toggleTheme}
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
      ) : (
        <AuthFlow onComplete={setAuthSession} />
      )}
    </>
  );
}
