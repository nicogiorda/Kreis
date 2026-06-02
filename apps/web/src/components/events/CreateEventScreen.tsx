import { Plus, X } from "@phosphor-icons/react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import type { CreateEventInput, KreisTopic } from "../../types";
import { cn } from "../../utils/cn";

type CreateEventScreenProps = {
  topics: KreisTopic[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreateEvent: (input: CreateEventInput) => void;
};

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function CreateEventScreen({
  topics,
  submitting = false,
  error,
  onClose,
  onCreateEvent
}: CreateEventScreenProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setCoverPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);

      return file ? URL.createObjectURL(file) : null;
    });
  }

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

  return (
    <section
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--app-bg)] text-kreis-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Crear evento"
      data-screen="create-event"
    >
      <form
        className="mx-auto min-h-[852px] w-full max-w-[430px] pb-[calc(44px+env(safe-area-inset-bottom))] pl-[22px] pr-[16px] pt-[calc(63px+env(safe-area-inset-top))]"
        onSubmit={handleSubmit}
      >
        <header className="flex h-[37px] items-center justify-between">
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

        <label className="mt-[21px] grid gap-[7px] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Nombre
          <input
            className="h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="eventTitle"
            required
            autoComplete="off"
          />
        </label>

        <label className="relative mt-[10px] grid h-[143px] cursor-pointer place-items-center overflow-hidden rounded-[20px] bg-kreis-event-surface text-kreis-muted">
          <input className="sr-only" type="file" accept="image/*" onChange={handleCoverChange} />
          {coverPreview ? <img className="absolute inset-0 size-full object-cover" src={coverPreview} alt="" /> : null}
          <span className={cn("relative grid justify-items-center gap-3", coverPreview && "rounded-[17px] bg-[rgba(10,10,10,0.38)] px-5 py-3 text-kreis-cream")}>
            <span className="grid size-12 place-items-center rounded-[18px] bg-kreis-orange text-kreis-cream">
              <Plus className="size-[28px]" weight="bold" aria-hidden="true" />
            </span>
            <span className="text-[16px] font-normal leading-[19px]">{coverPreview ? "Cambiar portada" : "Subí una portada"}</span>
          </span>
        </label>

        <label className="mt-[11px] grid gap-[5px] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Fecha y hora de inicio
          <input
            className="event-date-input relative h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal outline-0 focus:ring-2 focus:ring-kreis-orange/30"
            name="eventDate"
            required
            type="datetime-local"
          />
        </label>

        <label className="mt-[10px] grid gap-[7px] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Ubicación
          <input
            className="h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="eventPlace"
            required
            autoComplete="off"
          />
        </label>

        <label className="mt-[10px] grid gap-[5px] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Descripción
          <textarea
            className="h-[143px] min-w-0 resize-none rounded-[20px] border-0 bg-kreis-event-surface px-4 py-3 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="eventDescription"
            required
          />
        </label>

        <fieldset className="mt-[11px] min-w-0 border-0 p-0">
          <legend className="text-[16px] font-normal leading-[19px] text-kreis-muted">Topicos</legend>
          <div className="mt-[5px] flex min-h-[45px] flex-wrap content-start gap-x-[6px] gap-y-[5px]">
            {topics.map((topic) => (
              <button
                className={cn(
                  "h-5 rounded-[15px] border-0 px-[10px] text-[11px] font-medium leading-5 shadow-none transition-[background-color,color,transform] duration-150 ease-out active:scale-95",
                  selectedTopicIds.includes(topic.id) ? "bg-kreis-orange text-kreis-cream" : "bg-kreis-event-surface text-kreis-muted"
                )}
                type="button"
                key={topic.id}
                aria-pressed={selectedTopicIds.includes(topic.id)}
                onClick={() => toggleTopic(topic.id)}
              >
                {topic.name}
              </button>
            ))}
            {!topics.length ? <span className="text-[12px] leading-5 text-kreis-muted">No pudimos cargar los tópicos.</span> : null}
          </div>
        </fieldset>

        {error ? <p className="m-0 mt-1 text-center text-[12px] font-medium leading-[15px] text-kreis-orange">{error}</p> : null}

        <button
          className="relative -left-[3px] mx-auto mt-[23px] grid h-[37px] w-[159px] place-items-center rounded-[19px] border-0 bg-kreis-orange px-4 text-[16px] font-normal leading-[19px] text-kreis-cream shadow-none transition-[transform,filter] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
          type="submit"
          disabled={submitting || !selectedTopicIds.length}
        >
          {submitting ? "Creando..." : "Crear"}
        </button>
      </form>
    </section>
  );
}
