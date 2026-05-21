import { SealCheck } from "@phosphor-icons/react";
import { AltArrowRight } from "@solar-icons/react";
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
      <article className="grid min-h-[71px] overflow-hidden rounded-[21px] bg-kreis-event-surface text-kreis-ink transition-[background-color,color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none">
        <div className="grid min-h-[71px] grid-cols-[53px_minmax(0,1fr)_24px] items-center gap-3 px-2.5 py-[9px]">
          <div
            className="home-event-date-chip grid size-[53px] content-center justify-items-center rounded-[16px] bg-[var(--date-chip-bg)] text-[var(--date-chip-ink)] shadow-none transition-[background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
          >
            <strong className="block text-[18px] leading-[15px]">{event.day}</strong>
            <span className="block text-[11px] font-bold leading-[15px]">{event.month}</span>
          </div>
          <div className="grid min-w-0 content-center gap-1">
            <h3 className="m-0 inline-flex min-w-0 items-center gap-1.5 text-[16px] font-medium leading-[15px]">
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.title}</span>
              {officialBadge}
            </h3>
            <Meta
              className="!mt-0 text-[13px] font-normal leading-[15px] text-kreis-muted"
              items={locationMeta}
            />
          </div>
          <button
            className="grid size-6 place-items-center rounded-full border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label={`Ver detalles de ${event.title}`}
            onClick={() => onOpenEvents?.()}
          >
            <AltArrowRight className="size-[18px]" weight="Outline" aria-hidden="true" />
          </button>
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
