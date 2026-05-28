import { AltArrowRight, Calendar, CameraMinimalistic, MapPoint, RoundArrowRightUp, VerifiedCheck } from "@solar-icons/react";
import { Meta } from "../common/Meta";
import type { KreisEvent } from "../../types";

type EventCardProps = {
  event: KreisEvent;
  variant?: "full" | "compact";
  onOpenEvents?: () => void;
  onOpenEventDetails?: (eventId: string) => void;
};

const monthLabels: Record<string, string> = {
  ENE: "Enero",
  FEB: "Feb",
  MAR: "Marzo",
  ABR: "Abril",
  MAY: "Mayo",
  JUN: "Junio",
  JUL: "Julio",
  AGO: "Agosto",
  SEP: "Sept",
  OCT: "Oct",
  NOV: "Nov",
  DIC: "Dic"
};

function getEventDateLabel(event: KreisEvent): string {
  const month = monthLabels[event.month] ?? event.month;
  const day = String(Number(event.day));

  return `${day} ${month}`;
}

export function EventCard({ event, variant = "full", onOpenEvents, onOpenEventDetails }: EventCardProps) {
  const compact = variant === "compact";
  const locationMeta = [{ icon: "location" as const, text: event.place }];
  const officialBadge = event.official ? <VerifiedCheck className="event-official-badge size-[1em] flex-none" weight="Bold" aria-label="Evento oficial de UADE" /> : null;
  const eventDateLabel = getEventDateLabel(event);
  const openDetails = () => {
    if (onOpenEventDetails) {
      onOpenEventDetails(event.id);
      return;
    }

    onOpenEvents?.();
  };

  if (compact) {
    return (
      <article className="grid min-h-[71px] overflow-hidden rounded-[21px] bg-kreis-event-surface text-kreis-ink transition-[background-color,color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none">
        <div className="grid min-h-[71px] grid-cols-[53px_minmax(0,1fr)_24px] items-center gap-3 px-2.5 py-[9px]">
          <div
            className="home-event-date-chip grid size-[53px] content-center justify-items-center rounded-[16px] bg-[var(--date-chip-bg)] text-[var(--date-chip-ink)] shadow-none transition-[background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
          >
            <strong className="block text-[18px] leading-[18px]">{event.day}</strong>
            <span className="block text-[11px] font-bold leading-[13px]">{event.month}</span>
          </div>
          <div className="grid min-w-0 content-center gap-1">
            <h3 className="m-0 inline-flex min-w-0 items-center gap-1.5 text-[16px] font-medium leading-[19px]">
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.title}</span>
              {officialBadge}
            </h3>
            <Meta
              className="!mt-0 text-[13px] font-normal leading-[16px] text-kreis-muted"
              items={locationMeta}
            />
          </div>
          <button
            className="grid size-6 place-items-center rounded-full border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label={`Ver detalles de ${event.title}`}
            onClick={openDetails}
          >
            <AltArrowRight className="size-[18px]" weight="Outline" aria-hidden="true" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="grid h-[160px] min-w-0 content-start overflow-hidden rounded-[17px] bg-kreis-event-surface pt-2 text-kreis-ink transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none">
      <div className="event-photo-placeholder relative mx-[9px] h-[72px] overflow-hidden rounded-[12px]">
        {event.imageUrl ? (
          <img
            className="absolute inset-0 size-full object-cover"
            src={event.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <CameraMinimalistic className="absolute left-1/2 top-1/2 size-[24px] -translate-x-1/2 -translate-y-1/2" weight="LineDuotone" aria-hidden="true" />
        )}
      </div>
      <div className="grid min-h-0 content-start gap-[3px] px-[9px] pb-2.5 pt-[9px]">
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <h3 className="m-0 inline-flex min-w-0 flex-1 items-center gap-1 text-[14px] font-medium leading-[17px] text-kreis-ink">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.title}</span>
            {officialBadge}
          </h3>
          <button
            className="grid size-5 flex-none place-items-center border-0 bg-transparent p-0 text-kreis-green shadow-none [-webkit-tap-highlight-color:transparent]"
            type="button"
            aria-label={`Expandir informacion de ${event.title}`}
            onClick={openDetails}
          >
            <RoundArrowRightUp className="size-5" weight="Bold" aria-hidden="true" />
          </button>
        </div>
        <p className="m-0 inline-flex min-w-0 items-center gap-1 text-[13px] font-normal leading-[16px] text-kreis-muted">
          <MapPoint className="size-[12px] flex-none" weight="Outline" aria-hidden="true" />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.place}</span>
        </p>
        <p className="m-0 inline-flex min-w-0 items-center gap-1 text-[13px] font-normal leading-[16px] text-kreis-muted">
          <Calendar className="size-[12px] flex-none" weight="Outline" aria-hidden="true" />
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{eventDateLabel}</span>
        </p>
      </div>
    </article>
  );
}
