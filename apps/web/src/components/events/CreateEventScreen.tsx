import { CalendarBlank, Plus, X } from "@phosphor-icons/react";
import { type ChangeEvent, type FocusEvent, type FormEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import type { CreateEventInput, KreisTopic } from "../../types";
import { TopicRailSkeleton } from "../common/LoadingSkeleton";
import { LoadingState } from "../common/LoadingState";
import { cn } from "../../utils/cn";
import { normalize } from "../../utils/text";

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

function isAcademicTopic(topic: KreisTopic): boolean {
  return normalize(topic.name) === "academico";
}

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
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const creatableTopics = useMemo(() => topics.filter((topic) => !isAcademicTopic(topic)), [topics]);
  const creatableTopicIds = useMemo(() => new Set(creatableTopics.map((topic) => topic.id)), [creatableTopics]);
  const selectedCreatableTopicIds = selectedTopicIds.filter((topicId) => creatableTopicIds.has(topicId));
  const hasSelectedCreatableTopic = selectedCreatableTopicIds.length > 0;

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setCoverFile(file ?? null);

    setCoverPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);

      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedCreatableTopicIds.length) return;

    onCreateEvent({
      title: getFormValue(formData, "eventTitle"),
      date: getFormValue(formData, "eventDate"),
      place: getFormValue(formData, "eventPlace"),
      topicIds: selectedCreatableTopicIds,
      description: getFormValue(formData, "eventDescription"),
      coverFile: coverFile ?? undefined
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
      className="create-flow-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crear evento"
      data-screen="create-event"
    >
      <form
        className="create-event-form create-flow-form"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header create-flow-header">
          <h1 className="create-flow-title">Crea un evento</h1>
          <button
            className="create-flow-close-button text-kreis-cream"
            type="button"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <X className="size-[18px]" weight="bold" aria-hidden="true" />
          </button>
        </header>

        <label className="create-event-name create-flow-label create-flow-label--name">
          Nombre del evento
          <input
            className="create-event-input create-flow-input focus:ring-2 focus:ring-kreis-orange/30"
            name="eventTitle"
            required
            autoComplete="off"
            placeholder="Escribí el nombre del evento"
          />
        </label>

        <label className="create-event-cover relative mt-[clamp(6px,1.18dvh,10px)] grid h-[clamp(92px,16.78dvh,143px)] flex-none cursor-pointer place-items-center overflow-hidden rounded-[20px] bg-kreis-event-surface text-kreis-muted">
          <input className="sr-only" type="file" accept="image/*" onChange={handleCoverChange} />
          {coverPreview ? <img className="absolute inset-0 size-full object-cover" src={coverPreview} alt="" /> : null}
          <span className={cn("create-event-cover-label relative grid justify-items-center gap-[clamp(7px,1.4dvh,12px)]", coverPreview && "rounded-[17px] bg-[rgba(10,10,10,0.38)] px-5 py-3 text-kreis-cream")}>
            <span className="create-event-cover-plus grid size-[clamp(40px,5.63dvh,48px)] place-items-center rounded-[18px] bg-kreis-orange text-kreis-cream">
              <Plus className="size-[clamp(24px,3.28dvh,28px)]" weight="bold" aria-hidden="true" />
            </span>
            <span className="text-[16px] font-normal leading-[19px]">{coverPreview ? "Cambiar portada" : "Subí una portada"}</span>
          </span>
        </label>

        <label className="create-event-field create-flow-label create-flow-label--field-compact">
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

        <label className="create-event-field create-flow-label create-flow-label--field">
          Ubicación
          <input
            className="create-event-input create-flow-input focus:ring-2 focus:ring-kreis-orange/30"
            name="eventPlace"
            required
            autoComplete="off"
            placeholder="Ingresá dónde se realiza"
          />
        </label>

        <label className="create-event-field create-flow-label create-flow-label--field-compact">
          Descripción
          <span className="relative block">
            <textarea
              className="create-event-description create-flow-textarea create-flow-textarea--event focus:ring-2 focus:ring-kreis-orange/30"
              name="eventDescription"
              required
              maxLength={descriptionMaxLength}
              placeholder="Contá de qué se trata el evento"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="create-flow-counter" aria-live="polite">
              {description.length}/{descriptionMaxLength}
            </span>
          </span>
        </label>

        <fieldset className="create-event-topics mt-[clamp(5px,1.29dvh,11px)] min-w-0 flex-none border-0 p-0">
          <legend className="text-[16px] font-normal leading-[19px] text-kreis-muted">Topicos</legend>
          <div className="create-event-topics-rail mt-[clamp(3px,0.58dvh,5px)] grid h-[clamp(38px,5.28dvh,45px)] w-full min-w-0 grid-flow-col grid-rows-2 auto-cols-max content-start gap-x-[6px] gap-y-[5px] overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {creatableTopics.map((topic) => (
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
            {!creatableTopics.length && topicsStatus === "loading" ? <TopicRailSkeleton count={8} /> : null}
            {!creatableTopics.length && topicsStatus === "ready" ? <span className="text-[12px] leading-5 text-kreis-muted">No hay topicos disponibles.</span> : null}
            {!creatableTopics.length && topicsStatus === "error" ? (
              <button
                className="h-5 rounded-[15px] border-0 bg-kreis-orange px-[10px] text-[11px] font-medium leading-5 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95"
                type="button"
                onClick={onRetryTopics}
              >
                Reintentar topicos
              </button>
            ) : null}
          </div>
        </fieldset>

        {error ? <p className="m-0 mt-1 flex-none text-center text-[12px] font-medium leading-[15px] text-kreis-orange">{error}</p> : null}

        <button
          className="create-event-submit create-flow-submit"
          type="submit"
          disabled={submitting || !hasSelectedCreatableTopic}
        >
          {submitting ? <LoadingState label="Creando evento" variant="button" /> : "Crear"}
        </button>
      </form>
    </section>
  );
}

