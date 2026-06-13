import { X } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import type { CreateCommunityInput, KreisTopic } from "../../types";
import { TopicRailSkeleton } from "../common/LoadingSkeleton";
import { LoadingState } from "../common/LoadingState";
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
      className="create-flow-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crear comunidad"
      data-screen="create-community"
    >
      <form
        className="create-event-form create-flow-form"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header create-flow-header">
          <h1 className="create-flow-title">Crea una comunidad</h1>
          <button
            className="create-flow-close-button text-kreis-muted"
            type="button"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <X className="size-[18px]" weight="bold" aria-hidden="true" />
          </button>
        </header>

        <label className="create-event-name create-flow-label create-flow-label--name-spacious">
          Nombre de la comunidad
          <input
            className="create-event-input create-flow-input focus:ring-2 focus:ring-kreis-orange/30"
            name="communityName"
            required
            autoComplete="off"
            placeholder="Ej: Gaming Kreis"
          />
        </label>

        <label className="create-event-field create-flow-label create-flow-label--field-spacious">
          Descripción
          <span className="relative block">
            <textarea
              className="create-event-description create-flow-textarea create-flow-textarea--community focus:ring-2 focus:ring-kreis-orange/30"
              name="communityDescription"
              required
              maxLength={descriptionMaxLength}
              placeholder="Contá qué tipo de conversaciones van a pasar acá"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="create-flow-counter" aria-live="polite">
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
            {!topics.length && topicsStatus === "loading" ? <TopicRailSkeleton count={9} /> : null}
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
          className="create-event-submit create-flow-submit"
          type="submit"
          disabled={submitting || !hasSelectedTopic}
        >
          {submitting ? <LoadingState label="Creando comunidad" variant="button" /> : "Crear"}
        </button>
      </form>
    </section>
  );
}
