import { X } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import type { CreateCommunityInput, KreisTopic } from "../../types";
import { cn } from "../../utils/cn";

type CreateCommunityScreenProps = {
  topics: KreisTopic[];
  topicsStatus: "loading" | "ready" | "error";
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetryTopics: () => void;
  onCreateCommunity: (input: CreateCommunityInput) => void;
};

const descriptionMaxLength = 220;

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function CreateCommunityScreen({
  topics,
  topicsStatus,
  submitting = false,
  error,
  onClose,
  onRetryTopics,
  onCreateCommunity
}: CreateCommunityScreenProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const hasSelectedTopic = selectedTopicIds.length > 0;

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((currentTopicIds) => (
      currentTopicIds.includes(topicId)
        ? currentTopicIds.filter((currentTopicId) => currentTopicId !== topicId)
        : [...currentTopicIds, topicId]
    ));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSelectedTopic) return;

    const formData = new FormData(event.currentTarget);

    onCreateCommunity({
      name: getFormValue(formData, "communityName"),
      description: getFormValue(formData, "communityDescription"),
      topicIds: selectedTopicIds
    });
  }

  return (
    <section
      className="fixed inset-0 z-50 h-dvh overflow-hidden bg-[var(--app-bg)] text-kreis-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Crear comunidad"
      data-screen="create-community"
    >
      <form
        className="create-event-form mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden pb-[max(clamp(12px,5.16dvh,44px),env(safe-area-inset-bottom))] pl-[22px] pr-[16px] pt-[max(clamp(16px,7.39dvh,63px),env(safe-area-inset-top))]"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header flex h-[37px] flex-none items-center justify-between">
          <h1 className="m-0 font-['Amsi_Pro'] text-[24px] font-bold leading-[29px] tracking-normal">Crea una comunidad</h1>
          <button
            className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-muted shadow-none transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60"
            type="button"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <X className="size-[18px]" weight="bold" aria-hidden="true" />
          </button>
        </header>

        <label className="create-event-name mt-[clamp(14px,3.05dvh,26px)] grid flex-none gap-[clamp(4px,0.82dvh,7px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Nombre de la comunidad
          <input
            className="create-event-input h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
            name="communityName"
            required
            autoComplete="off"
            placeholder="Ej: Gaming Kreis"
          />
        </label>

        <label className="create-event-field mt-[clamp(10px,1.88dvh,16px)] grid flex-none gap-[clamp(3px,0.58dvh,5px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Descripción
          <span className="relative block">
            <textarea
              className="create-event-description block h-[clamp(118px,20.66dvh,176px)] w-full min-w-0 resize-none rounded-[20px] border-0 bg-kreis-event-surface px-4 pb-6 pt-3 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
              name="communityDescription"
              required
              maxLength={descriptionMaxLength}
              placeholder="Contá qué tipo de conversaciones van a pasar acá"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="pointer-events-none absolute bottom-[7px] right-3 text-[10px] font-medium leading-none text-kreis-muted" aria-live="polite">
              {description.length}/{descriptionMaxLength}
            </span>
          </span>
        </label>

        <fieldset className="create-event-topics mt-[clamp(10px,1.88dvh,16px)] min-w-0 flex-none border-0 p-0">
          <legend className="text-[16px] font-normal leading-[19px] text-kreis-muted">Tópicos</legend>
          <div className="create-event-topics-rail mt-[clamp(3px,0.58dvh,5px)] grid h-[clamp(62px,9.39dvh,80px)] w-full min-w-0 grid-flow-col grid-rows-3 auto-cols-max content-start gap-x-[6px] gap-y-[5px] overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            {!topics.length && topicsStatus === "ready" ? <span className="text-[12px] leading-5 text-kreis-muted">No hay tópicos disponibles.</span> : null}
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
          disabled={submitting || !hasSelectedTopic}
        >
          {submitting ? "Creando..." : "Crear"}
        </button>
      </form>
    </section>
  );
}
