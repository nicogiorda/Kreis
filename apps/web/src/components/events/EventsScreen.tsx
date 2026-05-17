import { EmptyState } from "../common/EmptyState";
import { EventCard } from "./EventCard";
import type { KreisEvent } from "../../types";
import { cn } from "../../utils/cn";

type EventsScreenProps = {
  events: KreisEvent[];
  eventFilter: string;
  eventCategories: string[];
  onFilter: (category: string) => void;
  onToggleInterest: (eventId: string) => void;
};

export function EventsScreen({ events, eventFilter, eventCategories, onFilter, onToggleInterest }: EventsScreenProps) {
  const filterButtonClass = (active: boolean) => cn(
    "grid min-h-8 flex-none place-items-center rounded-[18px] border px-3 text-center text-[0.82rem] font-medium leading-none shadow-none",
    active
      ? "border-transparent bg-kreis-orange text-kreis-surface-strong"
      : "border-kreis-line bg-kreis-app-bg text-kreis-muted"
  );

  return (
    <section className="animate-[rise_220ms_ease-out]" data-screen="events">
      <header className="mb-[18px] mt-2">
        <h1 className="m-0 text-[clamp(1.9rem,8vw,3.4rem)] leading-[1.02] tracking-normal">Eventos</h1>
        <p className="mt-[5px] text-kreis-muted leading-[1.45]">Todo lo que podes ver, guardar o anotarte desde Kreis.</p>
      </header>
      <div className="mb-4 flex gap-[9px] overflow-x-auto px-0.5 pb-[5px] pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar eventos por categoria">
        {eventCategories.map((category) => (
          <button className={filterButtonClass(eventFilter === category)} type="button" key={category} onClick={() => onFilter(category)}>
            {category}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.length ? events.map((event) => <EventCard event={event} key={event.id} onToggleInterest={onToggleInterest} />) : <EmptyState text="Proba buscando otra categoria." />}
      </div>
    </section>
  );
}
