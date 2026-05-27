import { CaretLeft, DotsThree, MapPin } from "@phosphor-icons/react";
import { VerifiedCheck } from "@solar-icons/react";
import heroDarkUrl from "../../assets/brand/fondo-uade-dark.webp";
import heroLightUrl from "../../assets/brand/fondo-uade-light.webp";
import type { KreisEvent, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";

type EventDetailScreenProps = {
  event: KreisEvent;
  themeMode: ThemeMode;
  onBack: () => void;
  onToggleInterest: (eventId: string) => void;
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

function getEventTime(event: KreisEvent): string {
  return event.time ?? "9:00";
}

function getEventOrganizer(event: KreisEvent): string {
  return event.organizer ?? (event.official ? "UADE" : "Kreis");
}

export function EventDetailScreen({ event, themeMode, onBack, onToggleInterest }: EventDetailScreenProps) {
  const heroUrl = themeMode === "dark" ? heroDarkUrl : heroLightUrl;
  const dateLabel = getEventDateLabel(event);
  const timeLabel = getEventTime(event);
  const organizerLabel = getEventOrganizer(event);
  const description = event.detailDescription ?? event.description;

  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-[430px] animate-[rise_220ms_ease-out] overflow-hidden bg-[var(--app-bg)] text-kreis-ink" data-screen="event-detail">
      <div className="relative h-[360px] overflow-hidden bg-[#cfe4db]">
        <img
          className="event-detail-hero-image absolute left-1/2 top-0 h-[122vw] max-h-[525px] w-[122%] max-w-none -translate-x-1/2 select-none object-cover"
          src={heroUrl}
          alt=""
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/5 to-transparent" aria-hidden="true" />

        <div className="absolute inset-x-0 top-[calc(64px+env(safe-area-inset-top))] z-[2] flex items-center justify-between px-[13px]">
          <button
            className="event-detail-glass-button grid size-[37px] place-items-center rounded-[12px] border-0 p-0 text-kreis-cream shadow-none transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label="Volver a eventos"
            onClick={onBack}
          >
            <CaretLeft className="size-[24px]" weight="bold" aria-hidden="true" />
          </button>
          <button
            className="event-detail-glass-button grid size-[37px] place-items-center rounded-[12px] border-0 p-0 text-kreis-cream shadow-none transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label="Mas opciones"
          >
            <DotsThree className="size-[24px]" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <article className="relative z-[3] -mt-5 flex min-h-[calc(100dvh-340px)] flex-col rounded-t-[25px] bg-[var(--app-bg)] px-[31px] pb-[calc(43px+env(safe-area-inset-bottom))] pt-[23px]">
        <div className="grid gap-[7px]">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="m-0 min-w-0 text-[22px] font-medium leading-[26px] tracking-normal text-kreis-ink">{event.title}</h1>
            {event.official ? (
              <VerifiedCheck className="size-[21px] flex-none text-[var(--official-badge)]" weight="Bold" aria-label="Evento oficial de UADE" />
            ) : null}
          </div>

          <p className="m-0 inline-flex min-w-0 items-center gap-1.5 text-[15px] font-normal leading-[18px] text-kreis-muted">
            <MapPin className="size-[16px] flex-none" weight="regular" aria-hidden="true" />
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.place}</span>
          </p>
        </div>

        <section className="mt-[21px] grid h-[76px] grid-cols-[minmax(82px,1fr)_1px_minmax(50px,0.68fr)_1px_minmax(92px,1.24fr)] items-center gap-x-3 rounded-[9px] bg-kreis-event-surface px-[19px]" aria-label="Informacion del evento">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-normal leading-[15px] text-kreis-ink">Fecha</p>
            <p className="m-0 mt-1 truncate text-[20px] font-medium leading-[22px] text-kreis-ink">{dateLabel}</p>
          </div>
          <span className="h-[27px] w-px bg-kreis-line" aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-normal leading-[15px] text-kreis-ink">Hora</p>
            <p className="m-0 mt-1 truncate text-[20px] font-medium leading-[22px] text-kreis-ink">{timeLabel}</p>
          </div>
          <span className="h-[27px] w-px bg-kreis-line" aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 whitespace-nowrap text-[13px] font-normal leading-[15px] text-kreis-ink">Organizado por</p>
            <p className="m-0 mt-1 truncate text-[20px] font-medium leading-[22px] text-kreis-ink">{organizerLabel}</p>
          </div>
        </section>

        <p className="m-0 mt-[23px] text-[14px] font-normal leading-[19px] text-kreis-ink">
          {description}
        </p>

        <div className="mt-auto flex justify-center pt-8">
          <button
            className={cn(
              "grid h-[37px] min-w-[159px] place-items-center rounded-[19px] border-0 px-7 text-center text-[15px] font-normal leading-[18px] text-kreis-cream shadow-none transition-[background-color,transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]",
              event.interested ? "bg-kreis-green" : "bg-kreis-orange"
            )}
            type="button"
            aria-pressed={event.interested}
            onClick={() => onToggleInterest(event.id)}
          >
            Me interesa
          </button>
        </div>
      </article>
    </section>
  );
}
