import { useLayoutEffect, useRef, useState } from "react";
import { CommunityCard } from "../communities/CommunityCard";
import { EmptyState } from "../common/EmptyState";
import { EventCard } from "../events/EventCard";
import { HeroBanner } from "./HeroBanner";
import type { Community, HomeTab, KreisEvent } from "../../types";
import { cn } from "../../utils/cn";

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
    <section className="grid gap-2.5" aria-label={title}>
      <h3 className="m-0 text-base font-bold leading-[1.1] text-kreis-ink">{title}</h3>
      <div className="grid auto-cols-[clamp(280px,84vw,360px)] grid-flow-col gap-3 overflow-x-auto px-0.5 pb-3 pt-px [scroll-snap-type:x_proximity] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pairItems(communities).map((pair) => (
          <div className="grid content-start gap-[9px] [scroll-snap-align:start]" key={pair.map((community) => community.id).join("-")}>
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
  const filterButtonClass = (active: boolean) => cn(
    "grid min-h-8 flex-none place-items-center rounded-[18px] border px-3 text-center text-[0.82rem] font-medium leading-none shadow-none",
    active
      ? "border-transparent bg-kreis-orange text-kreis-surface-strong"
      : "border-[rgba(31,24,19,0.08)] bg-kreis-app-bg text-[rgba(120,104,91,0.72)]"
  );

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
    <section className="grid gap-4 animate-[rise_220ms_ease-out]" data-screen="home">
      <HeroBanner />

      <section className="mt-0 rounded-none bg-transparent p-0 shadow-none">
        <div className="relative min-h-[210px] overflow-hidden" style={tabPanelHeight ? { height: tabPanelHeight } : undefined}>
          <div
            className={cn(
              "home-tab-panel absolute left-0 top-0 grid w-full gap-2.5 transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
              homeTab === "events" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-[22px] opacity-0"
            )}
            ref={eventsPanelRef}
            role="tabpanel"
            aria-label="Eventos"
            aria-hidden={homeTab !== "events"}
            inert={homeTab !== "events"}
          >
            <div className="flex gap-[9px] overflow-x-auto px-0.5 pb-[5px] pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar eventos por categoria">
              {eventCategories.map((category) => (
                <button className={filterButtonClass(eventFilter === category)} type="button" key={category} onClick={() => onFilter(category)}>
                  {category}
                </button>
              ))}
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
              {events.length ? events.map((event) => <EventCard event={event} key={event.id} variant="compact" onOpenEvents={onOpenEvents} />) : <EmptyState text="No hay eventos con ese filtro." />}
            </div>
          </div>

          <div
            className={cn(
              "home-tab-panel absolute left-0 top-0 grid w-full gap-2.5 transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
              homeTab === "communities" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-[22px] opacity-0"
            )}
            ref={communitiesPanelRef}
            role="tabpanel"
            aria-label="Comunidades"
            aria-hidden={homeTab !== "communities"}
            inert={homeTab !== "communities"}
          >
            <div className="flex gap-[9px] overflow-x-auto px-0.5 pb-[5px] pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar comunidades por categoria">
              {communityCategories.map((category) => (
                <button className={filterButtonClass(communityFilter === category)} type="button" key={category} onClick={() => onCommunityFilter(category)}>
                  {category}
                </button>
              ))}
            </div>
            {communities.length ? (
              <div className="grid gap-[22px]">
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
