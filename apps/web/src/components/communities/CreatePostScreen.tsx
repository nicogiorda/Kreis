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
      className="fixed inset-0 z-50 h-dvh overflow-hidden bg-[var(--app-bg)] text-kreis-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Crear post"
      data-screen="create-post"
    >
      <form
        className="create-event-form mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden pb-[max(clamp(12px,5.16dvh,44px),env(safe-area-inset-bottom))] pl-[22px] pr-[16px] pt-[max(clamp(16px,7.39dvh,63px),env(safe-area-inset-top))]"
        onSubmit={handleSubmit}
      >
        <header className="create-event-header flex h-[37px] flex-none items-center justify-between">
          <h1 className="m-0 font-['Amsi_Pro'] text-[24px] font-bold leading-[29px] tracking-normal">Subí un post</h1>
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
          Comunidad
          <select
            className="create-event-input h-10 min-w-0 rounded-[15px] border-0 bg-kreis-event-surface px-4 text-[16px] font-normal text-kreis-ink outline-0 focus:ring-2 focus:ring-kreis-orange/30 disabled:text-kreis-muted"
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

        <label className="create-event-field mt-[clamp(10px,1.88dvh,16px)] grid flex-none gap-[clamp(3px,0.58dvh,5px)] text-[16px] font-normal leading-[19px] text-kreis-muted">
          Post
          <span className="relative block">
            <textarea
              className="create-event-description block h-[clamp(218px,38dvh,324px)] w-full min-w-0 resize-none rounded-[20px] border-0 bg-kreis-event-surface px-4 pb-7 pt-3 text-[16px] font-normal text-kreis-ink outline-0 placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/30"
              name="postText"
              required
              maxLength={postMaxLength}
              placeholder="Contá qué querés compartir con tu comunidad"
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
            />
            <span className="pointer-events-none absolute bottom-[8px] right-3 text-[10px] font-medium leading-none text-kreis-muted" aria-live="polite">
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
          className="create-event-submit relative -left-[3px] mx-auto mt-auto grid h-[37px] w-[159px] flex-none place-items-center rounded-[19px] border-0 bg-kreis-orange px-4 text-[16px] font-normal leading-[19px] text-kreis-cream shadow-none transition-[transform,filter] duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
          type="submit"
          disabled={submitting || !canSubmit}
        >
          {submitting ? <LoadingState label="Publicando post" variant="button" /> : "Publicar"}
        </button>
      </form>
    </section>
  );
}
