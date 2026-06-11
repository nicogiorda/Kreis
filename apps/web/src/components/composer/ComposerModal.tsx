import type { FormEvent } from "react";
import type { Community, ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput, KreisTopic } from "../../types";
import { CreateCommunityScreen } from "../communities/CreateCommunityScreen";
import { CreateEventScreen } from "../events/CreateEventScreen";

type ComposerModalProps = {
  open: boolean;
  mode: ComposerMode;
  communities: Community[];
  eventTopics: KreisTopic[];
  eventTopicsStatus: "loading" | "ready" | "error";
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetryEventTopics: () => void;
  onCreateCommunity: (input: CreateCommunityInput) => void;
  onCreateEvent: (input: CreateEventInput) => void;
  onCreatePost: (input: CreatePostInput) => void;
};

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function ComposerModal({ open, mode, communities, eventTopics, eventTopicsStatus, submitting = false, error, onClose, onRetryEventTopics, onCreateCommunity, onCreateEvent, onCreatePost }: ComposerModalProps) {
  if (!open) return null;

  if (mode === "event") {
    return (
      <CreateEventScreen
        topics={eventTopics}
        topicsStatus={eventTopicsStatus}
        submitting={submitting}
        error={error}
        onClose={onClose}
        onRetryTopics={onRetryEventTopics}
        onCreateEvent={onCreateEvent}
      />
    );
  }

  if (mode === "community") {
    return (
      <CreateCommunityScreen
        topics={eventTopics}
        topicsStatus={eventTopicsStatus}
        submitting={submitting}
        error={error}
        onClose={onClose}
        onRetryTopics={onRetryEventTopics}
        onCreateCommunity={onCreateCommunity}
      />
    );
  }

  const joined = communities.filter((community) => community.joined && community.status !== "Pendiente");
  const dialogLabel = "Crear post";
  const kicker = "Nuevo post";
  const title = "Publicar en una comunidad";
  const submitLabel = "Publicar";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onCreatePost({
      communityId: getFormValue(formData, "communityId"),
      postText: getFormValue(formData, "postText")
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[rgba(31,24,19,0.34)] backdrop-blur-[5px]" onClick={onClose} />
      <section className="absolute bottom-2.5 left-2.5 right-2.5 rounded-kreis-card bg-kreis-surface px-4 pb-4 pt-3 shadow-[0_28px_70px_rgba(31,24,19,0.3)]" role="dialog" aria-modal="true" aria-label={dialogLabel}>
        <div className="mx-auto mb-3 h-[5px] w-[46px] rounded-[7px] bg-[rgba(120,104,91,0.28)]" />
        <header className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex min-h-6 w-max items-center rounded-kreis-small bg-kreis-beige px-[9px] text-[0.72rem] font-black uppercase text-kreis-orange">{kicker}</span>
            <h2 className="mb-0 mt-2 text-[1.35rem]">{title}</h2>
          </div>
          <button className="grid size-[42px] place-items-center rounded-kreis-small border-0 bg-kreis-beige font-black text-kreis-ink" type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </header>
        <form
          className="mt-4 grid gap-3 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-[14px] [&_input]:border [&_input]:border-kreis-line [&_input]:bg-kreis-lace [&_input]:px-3.5 [&_input]:font-bold [&_input]:text-kreis-ink [&_input]:outline-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[0.86rem] [&_label]:font-black [&_label]:text-kreis-muted [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-[14px] [&_select]:border [&_select]:border-kreis-line [&_select]:bg-kreis-lace [&_select]:px-3.5 [&_select]:font-bold [&_select]:text-kreis-ink [&_select]:outline-0 [&_textarea]:min-h-[118px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[14px] [&_textarea]:border [&_textarea]:border-kreis-line [&_textarea]:bg-kreis-lace [&_textarea]:px-3.5 [&_textarea]:pt-[13px] [&_textarea]:font-bold [&_textarea]:text-kreis-ink [&_textarea]:outline-0"
          onSubmit={handleSubmit}
        >
          <label>
            Comunidad
            <select name="communityId" required disabled={!joined.length}>
              {joined.map((community) => (
                <option value={community.id} key={community.id}>{community.name}</option>
              ))}
            </select>
          </label>
          <label>
            Post
            <textarea name="postText" required placeholder="Conta que estas buscando, proponiendo o armando..." />
          </label>
          {error ? <p className="m-0 text-[0.84rem] font-bold leading-[1.35] text-kreis-orange">{error}</p> : null}
          {!joined.length ? <p className="m-0 text-[0.84rem] font-bold leading-[1.35] text-kreis-muted">Unite a una comunidad aceptada antes de publicar.</p> : null}
          <button className="min-h-[42px] rounded-[14px] border-0 bg-kreis-orange px-4 font-black text-white shadow-none disabled:opacity-60" type="submit" disabled={submitting || !joined.length}>
            {submitLabel}
          </button>
        </form>
      </section>
    </div>
  );
}
