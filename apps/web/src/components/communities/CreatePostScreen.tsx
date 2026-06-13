import { X } from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";
import type { Community, CreatePostInput } from "../../types";
import { LoadingState } from "../common/LoadingState";

type CreatePostScreenProps = {
  communities: Community[];
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreatePost: (input: CreatePostInput) => void;
};

const postMaxLength = 500;

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function CreatePostScreen({
  communities,
  submitting = false,
  error,
  onClose,
  onCreatePost
}: CreatePostScreenProps) {
  const joinedCommunities = useMemo(
    () => communities.filter((community) => community.joined && community.status !== "Pendiente"),
    [communities]
  );
  const [requestedCommunityId, setRequestedCommunityId] = useState("");
  const selectedCommunityId = requestedCommunityId && joinedCommunities.some((community) => community.id === requestedCommunityId)
    ? requestedCommunityId
    : joinedCommunities[0]?.id ?? "";
  const [postText, setPostText] = useState("");
  const canSubmit = Boolean(selectedCommunityId && postText.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    const formData = new FormData(event.currentTarget);

    onCreatePost({
      communityId: getFormValue(formData, "communityId"),
      postText: getFormValue(formData, "postText")
    });
  }

  return (
    <section
      className="create-flow-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crear post"
      data-screen="create-post"
    >
      <form
        className="create-event-form create-flow-form"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header create-flow-header">
          <h1 className="create-flow-title">Subí un post</h1>
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
          Comunidad
          <select
            className="create-event-input create-flow-input focus:ring-2 focus:ring-kreis-orange/30 disabled:text-kreis-muted"
            name="communityId"
            required
            disabled={!joinedCommunities.length}
            value={selectedCommunityId}
            onChange={(event) => setRequestedCommunityId(event.target.value)}
          >
            {joinedCommunities.map((community) => (
              <option value={community.id} key={community.id}>{community.name}</option>
            ))}
          </select>
        </label>

        <label className="create-event-field create-flow-label create-flow-label--field-spacious">
          Post
          <span className="relative block">
            <textarea
              className="create-event-description create-flow-textarea create-flow-textarea--post focus:ring-2 focus:ring-kreis-orange/30"
              name="postText"
              required
              maxLength={postMaxLength}
              placeholder="Contá qué querés compartir con tu comunidad"
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
            />
            <span className="create-flow-counter create-flow-counter--post" aria-live="polite">
              {postText.length}/{postMaxLength}
            </span>
          </span>
        </label>

        {!joinedCommunities.length ? (
          <p className="m-0 mt-3 rounded-[16px] bg-kreis-event-surface px-4 py-3 text-[13px] font-normal leading-[17px] text-kreis-muted">
            Unite a una comunidad aceptada antes de publicar.
          </p>
        ) : null}

        {error ? <p className="m-0 mt-3 flex-none text-center text-[12px] font-medium leading-[15px] text-kreis-orange">{error}</p> : null}

        <button
          className="create-event-submit create-flow-submit"
          type="submit"
          disabled={submitting || !canSubmit}
        >
          {submitting ? <LoadingState label="Publicando post" variant="button" /> : "Publicar"}
        </button>
      </form>
    </section>
  );
}
