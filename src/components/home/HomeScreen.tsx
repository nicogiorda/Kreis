import { useLayoutEffect, useRef, useState } from "react";
import { CommunityCard } from "../communities/CommunityCard";
import { EmptyState } from "../common/EmptyState";
import { EventCard } from "../events/EventCard";
import { HeroBanner } from "./HeroBanner";
import type { Community, HomeTab, KreisEvent } from "../../types";

function pairItems<T>(items: T[]): T[][] {
  const pairs: T[][] = [];

  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }

  return pairs;
}

type CommunityShelfProps = {
  title: string;
  communities: Community[];
  onToggleJoin: (communityId: string) => void;
};

function CommunityShelf({ title, communities, onToggleJoin }: CommunityShelfProps) {
  if (!communities.length) {
    return <EmptyState text="No hay comunidades con ese filtro en esta seccion." />;
  }

  return (
    <section className="community-shelf" aria-label={title}>
      <h3>{title}</h3>
      <div className="community-scroll">
        {pairItems(communities).map((pair) => (
          <div className="community-column" key={pair.map((community) => community.id).join("-")}>
            {pair.map((community) => (
              <CommunityCard community={community} key={community.id} onToggleJoin={onToggleJoin} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

type HomeScreenProps = {
  events: KreisEvent[];
  communities: Community[];
  homeTab: HomeTab;
  eventFilter: string;
  eventCategories: string[];
  communityFilter: string;
  communityCategories: string[];
  onFilter: (category: string) => void;
  onCommunityFilter: (category: string) => void;
  onOpenEvents: () => void;
  onToggleJoin: (communityId: string) => void;
};

export function HomeScreen({
  events,
  communities,
  homeTab,
  eventFilter,
  eventCategories,
  communityFilter,
  communityCategories,
  onFilter,
  onCommunityFilter,
  onOpenEvents,
  onToggleJoin
}: HomeScreenProps) {
  const recommendedCommunities = communities.filter((community) => community.recommended);
  const popularCommunities = communities.filter((community) => community.popular).sort((current, next) => next.members - current.members);
  const eventsPanelRef = useRef<HTMLDivElement>(null);
  const communitiesPanelRef = useRef<HTMLDivElement>(null);
  const [tabPanelHeight, setTabPanelHeight] = useState(0);

  useLayoutEffect(() => {
    const activePanel = homeTab === "events" ? eventsPanelRef.current : communitiesPanelRef.current;
    if (!activePanel) return;

    const updateHeight = () => setTabPanelHeight(activePanel.offsetHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activePanel);

    return () => resizeObserver.disconnect();
  }, [homeTab]);

  return (
    <section className="screen is-active home-screen" data-screen="home">
      <HeroBanner />

      <section className={`tab-stage ${homeTab === "communities" ? "is-community-mode" : ""}`}>
        <div className="home-tab-viewport" data-active-tab={homeTab} style={tabPanelHeight ? { height: tabPanelHeight } : undefined}>
          <div className="home-tab-panel home-tab-panel-events" ref={eventsPanelRef} role="tabpanel" aria-label="Eventos" aria-hidden={homeTab !== "events"} inert={homeTab !== "events"}>
            <div className="filter-row" aria-label="Filtrar eventos por categoria">
              {eventCategories.map((category) => (
                <button className={`filter-button ${eventFilter === category ? "is-active" : ""}`} type="button" key={category} onClick={() => onFilter(category)}>
                  {category}
                </button>
              ))}
            </div>
            <div className="event-list main-feed">
              {events.length ? events.map((event) => <EventCard event={event} key={event.id} variant="compact" onOpenEvents={onOpenEvents} />) : <EmptyState text="No hay eventos con ese filtro." />}
            </div>
          </div>

          <div className="home-tab-panel home-tab-panel-communities" ref={communitiesPanelRef} role="tabpanel" aria-label="Comunidades" aria-hidden={homeTab !== "communities"} inert={homeTab !== "communities"}>
            <div className="filter-row" aria-label="Filtrar comunidades por categoria">
              {communityCategories.map((category) => (
                <button className={`filter-button ${communityFilter === category ? "is-active" : ""}`} type="button" key={category} onClick={() => onCommunityFilter(category)}>
                  {category}
                </button>
              ))}
            </div>
            {communities.length ? (
              <div className="community-shelves">
                <CommunityShelf title="Recomendadas para vos" communities={recommendedCommunities} onToggleJoin={onToggleJoin} />
                <CommunityShelf title="Mas populares" communities={popularCommunities} onToggleJoin={onToggleJoin} />
              </div>
            ) : (
              <EmptyState text="No hay comunidades nuevas con ese filtro." />
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
