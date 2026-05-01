import { EmptyState } from "../common/EmptyState";
import { EventCard } from "./EventCard";
import type { KreisEvent } from "../../types";

type EventsScreenProps = {
  events: KreisEvent[];
  onToggleInterest: (eventId: string) => void;
};

export function EventsScreen({ events, onToggleInterest }: EventsScreenProps) {
  return (
    <section className="screen is-active" data-screen="events">
      <header className="screen-title">
        <h1>Eventos</h1>
        <p>Todo lo que podes ver, guardar o anotarte desde Kreis.</p>
      </header>
      <div className="event-list">
        {events.length ? events.map((event) => <EventCard event={event} key={event.id} onToggleInterest={onToggleInterest} />) : <EmptyState text="Proba buscando otra categoria." />}
      </div>
    </section>
  );
}
