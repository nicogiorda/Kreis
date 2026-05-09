import { CaretRight, MinusCircle, PlusCircle, SealCheck } from "@phosphor-icons/react";
import { Meta } from "../common/Meta";
import { eventToneClass } from "../../utils/events";
import { cn } from "../../utils/cn";
import type { KreisEvent } from "../../types";

type EventCardProps = {
  event: KreisEvent;
  variant?: "full" | "compact";
  expanded?: boolean;
  onOpenEvents?: () => void;
  onToggleExpanded?: (eventId: string) => void;
  onToggleInterest?: (eventId: string) => void;
};

export function EventCard({ event, variant = "full", expanded = false, onOpenEvents, onToggleExpanded, onToggleInterest }: EventCardProps) {
  const compact = variant === "compact";
  const locationMeta = [{ icon: "location" as const, text: event.place }];
  const officialBadge = event.official ? <SealCheck className="event-official-badge size-[1em] flex-none" weight="fill" aria-label="Evento oficial de UADE" /> : null;
  const detailsId = `event-details-${event.id}`;
  const ToggleIcon = expanded ? MinusCircle : PlusCircle;

  if (compact) {
    return (
      <article
        className={cn(
          "grid overflow-hidden rounded-[14px] transition-[background-color,color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
          expanded ? "bg-kreis-green text-kreis-cream" : "bg-kreis-event-surface text-kreis-ink"
        )}
      >
        <div className="grid min-h-[71px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-[9px]">
          <div
            className={cn(
              "home-event-date-chip grid size-[53px] content-center justify-items-center rounded-[10px] shadow-none transition-[background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
              expanded ? "border-transparent bg-[rgba(10,10,10,0.2)] text-kreis-cream" : "bg-[var(--date-chip-bg)] text-[var(--date-chip-ink)]"
            )}
          >
            <strong className="block text-[1.18rem] leading-[0.95]">{event.day}</strong>
            <span className="mt-[3px] block text-[0.66rem] font-extrabold leading-none">{event.month}</span>
          </div>
          <div className="grid min-w-0 content-center gap-1.5">
            <h3 className="m-0 inline-flex min-w-0 items-center gap-1.5 text-base font-medium leading-[1.15]">
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.title}</span>
              {officialBadge}
            </h3>
            <Meta
              className={cn(
                "!mt-0.5 text-[0.82rem] font-normal leading-none",
                expanded ? "!text-[rgba(247,237,218,0.55)]" : "text-kreis-muted"
              )}
              items={locationMeta}
            />
          </div>
          <button
            className={cn(
              "grid size-8 place-items-center rounded-full border-0 bg-transparent p-0 shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
              expanded ? "text-kreis-cream" : "text-kreis-orange"
            )}
            type="button"
            aria-controls={detailsId}
            aria-expanded={expanded}
            aria-label={expanded ? `Ocultar detalles de ${event.title}` : `Ver detalles de ${event.title}`}
            onClick={() => onToggleExpanded ? onToggleExpanded(event.id) : onOpenEvents?.()}
          >
            <ToggleIcon className="size-[1.28rem]" weight="regular" aria-hidden="true" />
          </button>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
          id={detailsId}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-4 pb-[15px] pt-0 text-[0.69rem] leading-[1.36] text-kreis-cream">
              <p className="m-0">
                {event.description}{" "}
                <button
                  className="inline-flex items-center gap-1 border-0 bg-transparent p-0 align-baseline text-[0.66rem] font-medium leading-none text-kreis-pumpkin shadow-none"
                  type="button"
                  onClick={onOpenEvents}
                >
                  Ver detalle
                  <CaretRight className="relative top-px size-3" weight="bold" aria-hidden="true" />
                </button>
              </p>
            </div>
          </div>
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
