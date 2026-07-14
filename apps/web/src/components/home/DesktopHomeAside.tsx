import type { Community, EventLoadStatus, HomeTab, KreisEvent } from "../../types";
import { CommunityCard } from "../communities/CommunityCard";
import { EmptyState } from "../common/EmptyState";
import { EventCardSkeletonList } from "../common/LoadingSkeleton";
import { EventCard } from "../events/EventCard";

type DesktopHomeAsideProps = {
  events: KreisEvent[];
  eventLoadStatus: EventLoadStatus;
  communities: Community[];
  homeTab: HomeTab;
  onNavigateToCommunities: () => void;
  onOpenEventDetails: (eventId: string) => void;
  onOpenEvents: () => void;
  onRetryEvents: () => void;
  onToggleJoin: (communityId: string) => void;
};

export function DesktopHomeAside({
  events,
  eventLoadStatus,
  communities,
  homeTab,
  onNavigateToCommunities,
  onOpenEventDetails,
  onOpenEvents,
  onRetryEvents,
  onToggleJoin
}: DesktopHomeAsideProps) {
  const availableCommunities = communities.filter((community) => community.status !== "Pendiente");
  const joinedCommunities = availableCommunities.filter((community) => community.joined);
  const recommendedCommunities = availableCommunities
    .filter((community) => community.recommended && !community.joined)
    .sort((current, next) => next.members - current.members)
    .slice(0, 3);
  const communityItems = (joinedCommunities.length ? joinedCommunities : recommendedCommunities).slice(0, 3);
  const communityTitle = joinedCommunities.length ? "Tus comunidades" : "Comunidades para vos";

  if (homeTab === "communities") {
    return (
      <section className="desktop-home-aside-section" aria-labelledby="desktop-home-events-title">
        <div className="desktop-home-aside-heading">
          <div>
            <span className="desktop-home-aside-kicker">Agenda</span>
            <h2 id="desktop-home-events-title">Próximos eventos</h2>
          </div>
          <button type="button" onClick={onOpenEvents}>
            Ver todos
          </button>
        </div>

        <div className="desktop-home-aside-list">
          {events.length ? (
            events
              .slice(0, 4)
              .map((event) => (
                <EventCard event={event} key={event.id} variant="compact" onOpenEventDetails={onOpenEventDetails} />
              ))
          ) : eventLoadStatus === "loading" ? (
            <EventCardSkeletonList count={3} variant="compact" />
          ) : eventLoadStatus === "error" ? (
            <EmptyState
              title="No pudimos cargar los eventos"
              text="Intentá nuevamente en unos segundos."
              actionLabel="Reintentar"
              onAction={onRetryEvents}
            />
          ) : (
            <EmptyState text="No hay próximos eventos." />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="desktop-home-aside-section" aria-labelledby="desktop-home-communities-title">
      <div className="desktop-home-aside-heading">
        <div>
          <span className="desktop-home-aside-kicker">Comunidad</span>
          <h2 id="desktop-home-communities-title">{communityTitle}</h2>
        </div>
        <button type="button" onClick={onNavigateToCommunities}>
          Ver todas
        </button>
      </div>

      <div className="desktop-home-aside-list">
        {communityItems.length ? (
          communityItems.map((community) => (
            <CommunityCard community={community} key={community.id} onToggleJoin={onToggleJoin} />
          ))
        ) : (
          <EmptyState text="No hay comunidades disponibles." />
        )}
      </div>
    </section>
  );
}
