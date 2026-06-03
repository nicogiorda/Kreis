import { CalendarBlank, X } from "@phosphor-icons/react";
import { type FocusEvent, type FormEvent, type MouseEvent, useState } from "react";
import type { CreateEventInput, KreisTopic } from "../../types";
import { cn } from "../../utils/cn";

type CreateEventScreenProps = {
  topics: KreisTopic[];
  topicsStatus: "loading" | "ready" | "error";
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetryTopics: () => void;
  onCreateEvent: (input: CreateEventInput) => void;
};

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatEventDate(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  const month = MONTHS[(m ?? 1) - 1] ?? "";
  const time = timePart ? ` a las ${timePart.slice(0, 5)}` : "";
  return `${d ?? ""} ${month} ${y ?? ""}${time}`;
}

const descriptionMaxLength = 280;

export function CreateEventScreen({
  topics,
  topicsStatus,
  submitting = false,
  error,
  onClose,
  onRetryTopics,
  onCreateEvent
}: CreateEventScreenProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedTopicIds.length) return;

    onCreateEvent({
      title: getFormValue(formData, "eventTitle"),
      date: getFormValue(formData, "eventDate"),
      place: getFormValue(formData, "eventPlace"),
      topicIds: selectedTopicIds,
      description: getFormValue(formData, "eventDescription")
    });
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((currentTopicIds) => (
      currentTopicIds.includes(topicId)
        ? currentTopicIds.filter((currentTopicId) => currentTopicId !== topicId)
        : [...currentTopicIds, topicId]
    ));
  }

  function openDatePicker(event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>): void {
    try {
      event.currentTarget.showPicker?.();
    } catch {
      // Some browsers only allow the picker from a direct click; focus still keeps the input usable.
    }
  }

  return (
    <section
      className="fixed inset-0 z-50 h-dvh overflow-hidden bg-[var(--app-bg)] text-kreis-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Crear evento"
      data-screen="create-event"
    >
      <form
        className="create-event-form mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden pb-[max(clamp(12px,5.16dvh,44px),env(safe-area-inset-bottom))] pl-[22px] pr-[16px] pt-[max(clamp(16px,7.39dvh,63px),env(safe-area-inset-top))]"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header flex h-[37px] flex-none items-center justify-between">
          <h1 className="m-0 font-['Amsi_Pro'] text-[24px] font-bold leading-[29px] tracking-normal">Crea un evento</h1>
          <button
            className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
            type="button"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <X className="size-[18px]" weight="bold" aria-hidden="true" />
          </button>
        </header>

        <label className="create-event-name mt-[clamp(8px,2.46dvh,21px)] grid flex-none gap-[clamp(4px,0.82dvh,7px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Nombre del evento
          <input
            className="create-event-input h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="eventTitle"
            required
            autoComplete="off"
            placeholder="Escribí el nombre del evento"
          />
        </label>

        <label className="create-event-field mt-[clamp(5px,1.29dvh,11px)] grid flex-none gap-[clamp(3px,0.58dvh,5px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Fecha y hora de inicio
          <span className="relative block">
            <input
              className="absolute inset-0 z-10 h-full w-full cursor-pointer border-0 opacity-0"
              name="eventDate"
              required
              type="datetime-local"
              value={eventDate}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onChange={(event) => setEventDate(event.target.value)}
            />
            <span className="pointer-events-none flex h-10 items-center rounded-[15px] bg-kreis-event-surface px-4 pr-12">
              {eventDate
                ? <span className="text-[16px] font-normal text-kreis-ink">{formatEventDate(eventDate)}</span>
                : <span className="text-[14px] text-kreis-muted">Elegí la fecha y hora</span>}
            </span>
            <CalendarBlank className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-kreis-muted" weight="regular" aria-hidden="true" />
          </span>
        </label>

        <label className="create-event-field mt-[clamp(5px,1.18dvh,10px)] grid flex-none gap-[clamp(3px,0.82dvh,7px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Ubicación
          <input
            className="create-event-input h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="eventPlace"
            required
            autoComplete="off"
            placeholder="Ingresá dónde se realiza"
          />
        </label>

        <label className="create-event-field mt-[clamp(5px,1.18dvh,10px)] grid flex-none gap-[clamp(3px,0.58dvh,5px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Descripción
          <span className="relative block">
            <textarea
              className="create-event-description block h-[clamp(82px,16.78dvh,143px)] w-full min-w-0 resize-none rounded-[20px] border-0 bg-kreis-event-surface px-4 pb-6 pt-3 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
              name="eventDescription"
              required
              maxLength={descriptionMaxLength}
              placeholder="Contá de qué se trata el evento"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="pointer-events-none absolute bottom-[7px] right-3 text-[10px] font-medium leading-none text-kreis-muted" aria-live="polite">
              {description.length}/{descriptionMaxLength}
            </span>
          </span>
        </label>

        <fieldset className="create-event-topics mt-[clamp(5px,1.29dvh,11px)] min-w-0 flex-none border-0 p-0">
          <legend className="text-[16px] font-normal leading-[19px] text-kreis-muted">Topicos</legend>
          <div className="create-event-topics-rail mt-[clamp(3px,0.58dvh,5px)] grid h-[clamp(38px,5.28dvh,45px)] w-full min-w-0 grid-flow-col grid-rows-2 auto-cols-max content-start gap-x-[6px] gap-y-[5px] overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topics.map((topic) => (
              <button
                className={cn(
                  "h-5 rounded-[15px] border-0 px-[10px] text-[11px] font-medium leading-5 shadow-none transition-[background-color,color,transform] duration-150 ease-out active:scale-95",
                  selectedTopicIds.includes(topic.id) ? "bg-kreis-green text-kreis-cream" : "bg-kreis-event-surface text-kreis-muted"
                )}
                type="button"
                key={topic.id}
                aria-pressed={selectedTopicIds.includes(topic.id)}
                onClick={() => toggleTopic(topic.id)}
              >
                {topic.name}
              </button>
            ))}
            {!topics.length && topicsStatus === "loading" ? <span className="text-[12px] leading-5 text-kreis-muted">Cargando tópicos...</span> : null}
            {!topics.length && topicsStatus === "error" ? (
              <button
                className="h-5 rounded-[15px] border-0 bg-kreis-orange px-[10px] text-[11px] font-medium leading-5 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95"
                type="button"
                onClick={onRetryTopics}
              >
                Reintentar tópicos
              </button>
            ) : null}
          </div>
        </fieldset>

        {error ? <p className="m-0 mt-1 flex-none text-center text-[12px] font-medium leading-[15px] text-kreis-orange">{error}</p> : null}

        <button
          className="create-event-submit relative -left-[3px] mx-auto mt-auto grid h-[37px] w-[159px] flex-none place-items-center rounded-[19px] border-0 bg-kreis-orange px-4 text-[16px] font-normal leading-[19px] text-kreis-cream shadow-none transition-[transform,filter] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
          type="submit"
          disabled={submitting || !selectedTopicIds.length}
        >
          {submitting ? "Creando..." : "Crear"}
        </button>
      </form>
    </section>
  );
}
