import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { EmptyState } from "../common/EmptyState";
import { ThemeToggleIcon } from "../common/Icons";
import { EventCard } from "./EventCard";
import { EventTopicIcon } from "./EventTopicIcon";
import type { EventLoadStatus, KreisEvent, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { normalize } from "../../utils/text";

type EventsScreenProps = {
  events: KreisEvent[];
  eventLoadStatus: EventLoadStatus;
  eventFilter: string;
  eventCategories: string[];
  searchQuery: string;
  themeMode: ThemeMode;
  onFilter: (category: string) => void;
  onSearchChange: (query: string) => void;
  onCreateEvent: () => void;
  onOpenEventDetails: (eventId: string) => void;
  onRetryEvents: () => void;
  onToggleTheme: () => void;
};

function getCategoryLabel(category: string): string {
  if (category === "Todos") return "Todos";
  if (normalize(category) === "academico") return "Acad.";

  return category;
}

export function EventsScreen({
  events,
  eventLoadStatus,
  eventFilter,
  eventCategories,
  searchQuery,
  themeMode,
  onFilter,
  onSearchChange,
  onCreateEvent,
  onOpenEventDetails,
  onRetryEvents,
  onToggleTheme
}: EventsScreenProps) {
  const filterButtonClass = (active: boolean) => cn(
    "grid w-[39px] flex-none justify-items-center gap-[5px] border-0 bg-transparent p-0 text-center text-[10px] font-normal leading-[14px] text-kreis-muted shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
    active
      ? "text-kreis-ink [&_.event-category-dot]:bg-kreis-orange/20 [&_.event-category-dot]:text-kreis-orange [&_.event-category-dot]:ring-1 [&_.event-category-dot]:ring-kreis-orange/40"
      : "text-kreis-muted [&_.event-category-dot]:text-kreis-muted"
  );
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <section className="grid min-w-0 w-full max-w-[430px] animate-[rise_220ms_ease-out] pt-[63px] sm:mx-auto" data-screen="events">
      <div className="mb-[21px] flex h-[37px] items-center justify-end gap-[11px]">
        <button
          className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-[transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
          type="button"
          aria-label="Crear evento"
          onClick={onCreateEvent}
        >
          <Plus className="size-[21px]" weight="bold" aria-hidden="true" />
        </button>
        <button
          className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-muted shadow-none transition-[transform,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 [&_svg]:size-[20px]"
          type="button"
          aria-label={nextThemeLabel}
          aria-pressed={themeMode === "dark"}
          onClick={onToggleTheme}
        >
          <ThemeToggleIcon themeMode={themeMode} />
        </button>
      </div>

      <header className="mb-[14px] text-center">
        <h1 className="m-0 text-[38px] font-black leading-[49px] tracking-normal text-kreis-ink">Eventos</h1>
      </header>

      <label className="events-search-field relative grid h-10 items-center rounded-[20px] bg-kreis-event-surface text-kreis-muted" aria-label="Buscar eventos por lugar">
        <MagnifyingGlass className="pointer-events-none absolute left-[14px] top-1/2 size-[17px] -translate-y-1/2" weight="regular" aria-hidden="true" />
        <input
          className="events-search-input h-full min-w-0 appearance-none rounded-[20px] border-0 bg-transparent py-0 pl-[47px] pr-4 text-[16px] font-normal leading-10 text-kreis-ink outline-0 placeholder:text-kreis-muted"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          type="search"
          placeholder="Busca tu lugar"
        />
      </label>

      <section className="mt-4 min-w-0" aria-labelledby="event-category-title">
        <h2 id="event-category-title" className="m-0 text-[18px] font-medium leading-[22px] text-kreis-ink">Busca por categoría</h2>
        <div className="mt-[7px] flex w-full min-w-0 gap-[13px] overflow-x-auto px-[9px] py-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar eventos por categoria">
          {eventCategories.map((category) => (
            <button className={filterButtonClass(eventFilter === category)} type="button" key={category} onClick={() => onFilter(category)}>
              <span className="event-category-dot grid size-[39px] place-items-center rounded-full bg-kreis-event-surface transition-[background-color,box-shadow,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]" aria-hidden="true">
                <EventTopicIcon category={category} />
              </span>
              <span className="block max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap">{getCategoryLabel(category)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4">
        <h2 className="m-0 text-[18px] font-medium leading-[22px] text-kreis-ink">Todos los eventos</h2>
      </div>

      <div className="mt-[13px] grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-x-[17px] gap-y-[15px]">
        {events.length ? events.map((event) => <EventCard event={event} key={event.id} onOpenEventDetails={onOpenEventDetails} />) : eventLoadStatus === "loading" ? (
          <div className="col-span-full">
            <EmptyState title="Cargando eventos" text="Estamos buscando todos los eventos." />
          </div>
        ) : eventLoadStatus === "error" ? (
          <div className="col-span-full">
            <EmptyState title="No pudimos cargar los eventos" text="Intentá nuevamente en unos segundos." actionLabel="Reintentar" onAction={onRetryEvents} />
          </div>
        ) : (
          <div className="col-span-full">
            <EmptyState text="Proba buscando otra categoria." />
          </div>
        )}
      </div>
    </section>
  );
}
