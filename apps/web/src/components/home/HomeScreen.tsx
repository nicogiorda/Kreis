import { useLayoutEffect, useRef, useState } from "react";
import { CommunityCard } from "../communities/CommunityCard";
import { EmptyState } from "../common/EmptyState";
import { EventCard } from "../events/EventCard";
import { HeroBanner } from "./HeroBanner";
import type { Community, HomeTab, KreisEvent, ThemeMode } from "../../types";
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
    return <EmptyState text="No hay comunidades con ese filtro en esta sección." />;
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
  communityFilter: string;
  communityCategories: string[];
  menuOpen: boolean;
  themeMode: ThemeMode;
  onHomeTab: (tab: HomeTab) => void;
  onCommunityFilter: (category: string) => void;
  onOpenEvents: () => void;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
  onToggleJoin: (communityId: string) => void;
};

export function HomeScreen({
  events,
  communities,
  homeTab,
  communityFilter,
  communityCategories,
  menuOpen,
  themeMode,
  onHomeTab,
  onCommunityFilter,
  onOpenEvents,
  onToggleTheme,
  onToggleMenu,
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
      : "border-kreis-line bg-kreis-event-surface text-kreis-muted"
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
    <section className="grid animate-[rise_220ms_ease-out]" data-screen="home">
      <HeroBanner menuOpen={menuOpen} themeMode={themeMode} onToggleTheme={onToggleTheme} onToggleMenu={onToggleMenu} />

      <div className="relative z-[3] -mx-[var(--page-gutter)] w-[calc(100%+(var(--page-gutter)*2))] bg-kreis-green">
        <div className="home-panel-surface relative rounded-t-[40px] bg-[var(--home-panel-bg)] px-3 pt-[19px]">
          <div className="absolute left-1/2 top-[6px] h-[3px] w-[55px] -translate-x-1/2 rounded bg-[rgba(10,10,10,0.1)]" aria-hidden="true" />

          <div className="grid gap-0">
            <div className={cn("home-header-switch home-switch-rail relative isolate mx-auto grid h-[25px] grid-cols-2 overflow-hidden rounded-[10px]", homeTab === "communities" && "is-communities-active")} role="tablist" aria-label="Cambiar vista principal">
              <button
                className="relative z-[1] grid min-h-[25px] min-w-0 place-items-center whitespace-nowrap rounded-[10px] border-0 bg-transparent px-2 text-center text-[13px] font-medium leading-[15px] tracking-normal transition-[color,transform] duration-200 ease-out active:scale-[0.98]"
                type="button"
                role="tab"
                aria-selected={homeTab === "events"}
                onClick={() => onHomeTab("events")}
              >
                Eventos
              </button>
              <button
                className="relative z-[1] grid min-h-[25px] min-w-0 place-items-center whitespace-nowrap rounded-[10px] border-0 bg-transparent px-2 text-center text-[13px] font-medium leading-[15px] tracking-normal transition-[color,transform] duration-200 ease-out active:scale-[0.98]"
                type="button"
                role="tab"
                aria-selected={homeTab === "communities"}
                onClick={() => onHomeTab("communities")}
              >
                Comunidades
              </button>
            </div>

            <section className="home-content-rail mx-auto mt-[21px] rounded-none bg-transparent p-0 shadow-none">
              <div className="relative min-h-[210px] overflow-hidden transition-[height] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none" style={tabPanelHeight ? { height: tabPanelHeight } : undefined}>
                <div
                  className={cn(
                    "home-tab-panel absolute left-0 top-0 grid w-full gap-[19px] pb-[112px] transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
                    homeTab === "events" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-[22px] opacity-0"
                  )}
                  ref={eventsPanelRef}
                  role="tabpanel"
                  aria-label="Eventos"
                  aria-hidden={homeTab !== "events"}
                  inert={homeTab !== "events"}
                >
                  <div className="flex h-[15px] items-center justify-between gap-4 px-[10px]">
                    <h2 className="m-0 text-[18px] font-medium leading-[15px] text-kreis-ink">Próximos eventos</h2>
                    <button className="border-0 bg-transparent p-0 text-[14px] font-medium leading-[15px] text-kreis-orange shadow-none" type="button" onClick={onOpenEvents}>
                      Ver más
                    </button>
                  </div>
                  <div className="grid gap-[10px]">
                    {events.length ? events.map((event) => (
                      <EventCard
                        event={event}
                        key={event.id}
                        variant="compact"
                        onOpenEvents={onOpenEvents}
                      />
                    )) : <EmptyState text="No hay próximos eventos con esa búsqueda." />}
                  </div>
                </div>

                <div
                  className={cn(
                    "home-tab-panel absolute left-0 top-0 grid w-full gap-2.5 pb-[112px] transition-[transform,opacity] duration-[340ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
                    homeTab === "communities" ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-[22px] opacity-0"
                  )}
                  ref={communitiesPanelRef}
                  role="tabpanel"
                  aria-label="Comunidades"
                  aria-hidden={homeTab !== "communities"}
                  inert={homeTab !== "communities"}
                >
                  <div className="flex gap-[9px] overflow-x-auto px-0.5 pb-[5px] pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar comunidades por categoría">
                    {communityCategories.map((category) => (
                      <button className={filterButtonClass(communityFilter === category)} type="button" key={category} onClick={() => onCommunityFilter(category)}>
                        {category}
                      </button>
                    ))}
                  </div>
                  {communities.length ? (
                    <div className="grid gap-[22px]">
                      <CommunityShelf title="Recomendadas para vos" communities={recommendedCommunities} onToggleJoin={onToggleJoin} />
                      <CommunityShelf title="Más populares" communities={popularCommunities} onToggleJoin={onToggleJoin} />
                    </div>
                  ) : (
                    <EmptyState text="No hay comunidades nuevas con ese filtro." />
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
