import { SealCheck } from "@phosphor-icons/react";
import { Meta } from "../common/Meta";
import { eventToneClass } from "../../utils/events";
import { cn } from "../../utils/cn";
import type { KreisEvent } from "../../types";

type EventCardProps = {
  event: KreisEvent;
  variant?: "full" | "compact";
  onOpenEvents?: () => void;
  onToggleInterest?: (eventId: string) => void;
};

export function EventCard({ event, variant = "full", onOpenEvents, onToggleInterest }: EventCardProps) {
  const compact = variant === "compact";
  const locationMeta = [{ icon: "location" as const, text: event.place }];
  const officialBadge = event.official ? <SealCheck className="event-official-badge size-[1em] flex-none" weight="fill" aria-label="Evento oficial de UADE" /> : null;

  if (compact) {
    return (
      <article className="grid min-h-[76px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 overflow-hidden rounded-kreis-card bg-kreis-event-surface p-2.5" onClick={onOpenEvents}>
        <div className="home-event-date-chip grid size-14 content-center justify-items-center rounded-[13px] bg-[var(--date-chip-bg)] text-[var(--date-chip-ink)] shadow-none">
          <strong className="block text-[1.18rem] leading-[0.95]">{event.day}</strong>
          <span className="mt-[3px] block text-[0.66rem] font-extrabold leading-none">{event.month}</span>
        </div>
        <div className="grid min-w-0 content-center gap-1.5">
          <h3 className="m-0 inline-flex min-w-0 items-center gap-1.5 text-base font-medium leading-[1.15]">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.title}</span>
            {officialBadge}
          </h3>
          <Meta className="!mt-0.5 text-[0.82rem] font-normal leading-none" items={locationMeta} />
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-kreis-card bg-kreis-event-surface">
      <div className={cn("grid min-h-[120px] grid-cols-[1fr_auto] items-end gap-3 p-3.5", eventToneClass(event.tone), event.tone === "beige" ? "text-kreis-ink" : "text-white")}>
        <span className="grid size-[54px] place-items-center rounded-[14px] bg-white/20 text-[1.7rem]">{event.icon}</span>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <h3 className="m-0 inline-flex max-w-full items-center gap-1.5 text-[1.06rem] font-bold">
            <span className="min-w-0">{event.title}</span>
            {officialBadge}
          </h3>
          <p className="mt-[5px] font-normal text-kreis-muted leading-[1.45]">{event.description}</p>
          <Meta items={locationMeta} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="w-[58px] rounded-kreis-small bg-kreis-date-surface px-1.5 py-2 text-center text-kreis-orange shadow-none">
            <strong className="block text-[1.15rem] leading-none">{event.day}</strong>
            <span className="mt-[3px] block text-[0.72rem] font-black">{event.month}</span>
          </span>
          <button
            className={cn(
              "min-h-[42px] rounded-[14px] px-4 font-black shadow-none",
              event.interested
                ? "border-0 bg-kreis-orange text-white"
                : "border border-kreis-orange bg-kreis-surface-strong text-kreis-orange"
            )}
            type="button"
            onClick={() => onToggleInterest?.(event.id)}
          >
            {event.interested ? "Anotado" : "Me interesa"}
          </button>
        </div>
      </div>
    </article>
  );
}
