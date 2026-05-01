import { useMemo, useState } from "react";
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
import type { ComposerMode, CreateCommunityInput, CreatePostInput, HomeTab, Screen } from "../types";
import { scrollTop } from "../utils/navigation";
import { normalize } from "../utils/text";

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

  function navigate(nextScreen: Screen): void {
    setScreen(nextScreen);
    setMenuOpen(false);
    scrollTop();
  }

  function openComposer(mode: ComposerMode): void {
    setComposerMode(mode);
    setComposerOpen(true);
    if (mode === "community") setMenuOpen(false);
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
      <div className={`app-shell ${menuOpen ? "is-menu-open" : ""}`}>
        <Header
          globalQuery={globalQuery}
          homeTab={homeTab}
          menuOpen={menuOpen}
          showHomeTabs={screen === "home"}
          onHomeTab={setHomeTab}
          onQueryChange={setGlobalQuery}
          onToggleMenu={() => setMenuOpen((open) => !open)}
        />
        <CommunityMenu
          menuOpen={menuOpen}
          communities={communities}
          onOpenCommunity={() => navigate("communities")}
          onCreateCommunity={() => openComposer("community")}
        />

        <main className="app-main" tabIndex={-1}>
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
          {screen === "profile" && <ProfileScreen communities={communities} events={events} activity={activity} />}
        </main>

        <BottomNav screen={screen} onNavigate={navigate} />
        <ComposerModal
          open={composerOpen}
          mode={composerMode}
          communities={communities}
          onClose={() => setComposerOpen(false)}
          onCreateCommunity={createCommunity}
          onCreatePost={createPost}
        />
      </div>
    </>
  );
}
