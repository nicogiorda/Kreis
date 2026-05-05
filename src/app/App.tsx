import { useEffect, useMemo, useState } from "react";
import { ComposerModal } from "../components/composer/ComposerModal";
import { CommunitiesScreen } from "../components/communities/CommunitiesScreen";
import { EventsScreen } from "../components/events/EventsScreen";
import { SplashScreen } from "../components/common/SplashScreen";
import { HomeScreen } from "../components/home/HomeScreen";
import { BottomNav } from "../components/navigation/BottomNav";
import { CommunityMenu } from "../components/navigation/CommunityMenu";
import { Header } from "../components/navigation/Header";
import { ProfileScreen } from "../components/profile/ProfileScreen";
import { initialActivity, initialCommunities, initialEvents } from "../data/mockData";
import type { ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput, HomeTab, Screen, ThemeMode } from "../types";
import { cn } from "../utils/cn";
import { scrollTop } from "../utils/navigation";
import { normalize } from "../utils/text";

const themeStorageKey = "kreis-theme-mode-v2";

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
  const [events, setEvents] = useState(initialEvents);
  const [communities, setCommunities] = useState(initialCommunities);
  const [activity, setActivity] = useState(initialActivity);
  const [screen, setScreen] = useState<Screen>("home");
  const [homeTab, setHomeTab] = useState<HomeTab>("events");
  const [eventFilter, setEventFilter] = useState("Todos");
  const [communityFilter, setCommunityFilter] = useState("Todos");
  const [globalQuery, setGlobalQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("post");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());

  const query = normalize(globalQuery.trim());
  const matchesQuery = (text: string): boolean => !query || normalize(text).includes(query);

  const eventCategories = useMemo<string[]>(() => ["Todos", ...new Set(events.map((event) => event.category))], [events]);
  const communityCategories = useMemo<string[]>(() => ["Todos", ...new Set(communities.map((community) => community.category))], [communities]);

  const visibleEvents = events.filter((event) => {
    const categoryMatch = eventFilter === "Todos" || event.category === eventFilter;
    return categoryMatch && matchesQuery(`${event.title} ${event.category} ${event.place} ${event.description}`);
  });

  const discoverCommunities = communities.filter((community) => {
    const categoryMatch = communityFilter === "Todos" || community.category === communityFilter;
    return !community.joined && categoryMatch && matchesQuery(`${community.name} ${community.category} ${community.pulse} ${community.description ?? ""}`);
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

  function navigate(nextScreen: Screen): void {
    setScreen(nextScreen);
    setMenuOpen(false);
    scrollTop();
  }

  function openComposer(mode: ComposerMode): void {
    setComposerMode(mode);
    setComposerOpen(true);
    if (mode === "community" || mode === "event") setMenuOpen(false);
  }

  function toggleTheme(): void {
    setThemeMode((current) => current === "dark" ? "light" : "dark");
  }

  function toggleInterest(eventId: string): void {
    setEvents((items) => items.map((event) => event.id === eventId ? { ...event, interested: !event.interested } : event));
  }

  function toggleJoin(communityId: string): void {
    setCommunities((items) => items.map((community) => community.id === communityId ? { ...community, joined: !community.joined } : community));
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

  function createEvent({ title, date, place, category, description }: CreateEventInput): void {
    if (!title || !date || !place || !category || !description) return;

    const [year, month, day] = date.split("-").map(Number);
    const eventDate = new Date(year, month - 1, day);
    const weekdays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const monthLabel = months[eventDate.getMonth()] ?? "";
    const dayLabel = String(eventDate.getDate()).padStart(2, "0");
    const dateLabel = `${weekdays[eventDate.getDay()] ?? ""} ${dayLabel} ${monthLabel.charAt(0)}${monthLabel.slice(1).toLowerCase()}`;

    setEvents((items) => [
      {
        id: `event-${Date.now()}`,
        title,
        date: dateLabel,
        day: dayLabel,
        month: monthLabel,
        place,
        category,
        icon: title.slice(0, 2).toUpperCase(),
        tone: "orange",
        interested: true,
        description
      },
      ...items
    ]);
    setScreen("events");
    setHomeTab("events");
    setComposerOpen(false);
    scrollTop();
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
      <div className={cn("app-shell mx-auto min-h-screen min-h-dvh w-[min(100%,1120px)] overflow-x-hidden pb-[calc(var(--nav-height)+18px)] md:px-6 md:pb-[calc(var(--nav-height)+28px)]", menuOpen && "is-menu-open")}>
        {screen !== "profile" ? (
          <Header
            globalQuery={globalQuery}
            homeTab={homeTab}
            menuOpen={menuOpen}
            showHomeTabs={screen === "home"}
            themeMode={themeMode}
            onHomeTab={setHomeTab}
            onQueryChange={setGlobalQuery}
            onToggleTheme={toggleTheme}
            onToggleMenu={() => setMenuOpen((open) => !open)}
          />
        ) : null}
        <CommunityMenu
          menuOpen={menuOpen}
          communities={communities}
          onOpenCommunity={() => navigate("communities")}
          onCreateEvent={() => openComposer("event")}
          onCreateCommunity={() => openComposer("community")}
        />

        <main className="menu-shift px-[var(--page-gutter)] transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:px-0" tabIndex={-1}>
          {screen === "home" && (
            <HomeScreen
              events={visibleEvents}
              communities={discoverCommunities}
              homeTab={homeTab}
              eventFilter={eventFilter}
              eventCategories={eventCategories}
              communityFilter={communityFilter}
              communityCategories={communityCategories}
              onFilter={setEventFilter}
              onCommunityFilter={setCommunityFilter}
              onOpenEvents={() => navigate("events")}
              onToggleJoin={toggleJoin}
            />
          )}
          {screen === "events" && <EventsScreen events={visibleEvents} onToggleInterest={toggleInterest} />}
          {screen === "communities" && <CommunitiesScreen communities={communities} discover={discoverCommunities} posts={activity} onToggleJoin={toggleJoin} />}
          {screen === "profile" && (
            <ProfileScreen
              communities={communities}
              events={events}
              activity={activity}
              menuOpen={menuOpen}
              themeMode={themeMode}
              onToggleMenu={() => setMenuOpen((open) => !open)}
              onToggleTheme={toggleTheme}
              onOpenCommunities={() => navigate("communities")}
              onOpenEvents={() => navigate("events")}
            />
          )}
        </main>

        <BottomNav screen={screen} onNavigate={navigate} />
        <ComposerModal
          open={composerOpen}
          mode={composerMode}
          communities={communities}
          onClose={() => setComposerOpen(false)}
          onCreateCommunity={createCommunity}
          onCreateEvent={createEvent}
          onCreatePost={createPost}
        />
      </div>
    </>
  );
}
