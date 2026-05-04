import { EmptyState } from "../common/EmptyState";
import { EventCard } from "./EventCard";
import type { KreisEvent } from "../../types";

type EventsScreenProps = {
  events: KreisEvent[];
  onToggleInterest: (eventId: string) => void;
};

export function EventsScreen({ events, onToggleInterest }: EventsScreenProps) {
  return (
    <section className="animate-[rise_220ms_ease-out]" data-screen="events">
      <header className="mb-[18px] mt-2">
        <h1 className="m-0 text-[clamp(1.9rem,8vw,3.4rem)] leading-[1.02] tracking-normal">Eventos</h1>
        <p className="mt-[5px] text-kreis-muted leading-[1.45]">Todo lo que podes ver, guardar o anotarte desde Kreis.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.length ? events.map((event) => <EventCard event={event} key={event.id} onToggleInterest={onToggleInterest} />) : <EmptyState text="Proba buscando otra categoria." />}
      </div>
    </section>
  );
}
