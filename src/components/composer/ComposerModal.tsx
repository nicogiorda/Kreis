import type { FormEvent } from "react";
import type { Community, ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput } from "../../types";

type ComposerModalProps = {
  open: boolean;
  mode: ComposerMode;
  communities: Community[];
  onClose: () => void;
  onCreateCommunity: (input: CreateCommunityInput) => void;
  onCreateEvent: (input: CreateEventInput) => void;
  onCreatePost: (input: CreatePostInput) => void;
};

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function ComposerModal({ open, mode, communities, onClose, onCreateCommunity, onCreateEvent, onCreatePost }: ComposerModalProps) {
  if (!open) return null;

  const joined = communities.filter((community) => community.joined);
  const isCommunity = mode === "community";
  const isEvent = mode === "event";
  const dialogLabel = isCommunity ? "Crear comunidad" : isEvent ? "Publicar evento" : "Crear post";
  const kicker = isCommunity ? "Nuevo circulo" : isEvent ? "Nuevo evento" : "Nuevo post";
  const title = isCommunity ? "Crear comunidad" : isEvent ? "Publicar un evento" : "Publicar en una comunidad";
  const submitLabel = isCommunity ? "Crear comunidad" : isEvent ? "Publicar evento" : "Publicar";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (isCommunity) {
      onCreateCommunity({
        name: getFormValue(formData, "communityName"),
        category: getFormValue(formData, "communityCategory")
      });
      return;
    }

    if (isEvent) {
      onCreateEvent({
        title: getFormValue(formData, "eventTitle"),
        date: getFormValue(formData, "eventDate"),
        place: getFormValue(formData, "eventPlace"),
        category: getFormValue(formData, "eventCategory"),
        description: getFormValue(formData, "eventDescription")
      });
      return;
    }

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
          className="mt-4 grid gap-3 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-[14px] [&_input]:border [&_input]:border-[rgba(31,24,19,0.1)] [&_input]:bg-kreis-lace [&_input]:px-3.5 [&_input]:font-bold [&_input]:text-kreis-ink [&_input]:outline-0 [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[0.86rem] [&_label]:font-black [&_label]:text-kreis-muted [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-[14px] [&_select]:border [&_select]:border-[rgba(31,24,19,0.1)] [&_select]:bg-kreis-lace [&_select]:px-3.5 [&_select]:font-bold [&_select]:text-kreis-ink [&_select]:outline-0 [&_textarea]:min-h-[118px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[14px] [&_textarea]:border [&_textarea]:border-[rgba(31,24,19,0.1)] [&_textarea]:bg-kreis-lace [&_textarea]:px-3.5 [&_textarea]:pt-[13px] [&_textarea]:font-bold [&_textarea]:text-kreis-ink [&_textarea]:outline-0"
          onSubmit={handleSubmit}
        >
          {isCommunity ? (
            <>
              <label>
                Nombre
                <input name="communityName" required placeholder="Ej: Club de fotografia" />
              </label>
              <label>
                Categoria
                <input name="communityCategory" required placeholder="Cultura, deporte, tecnologia..." />
              </label>
            </>
          ) : isEvent ? (
            <>
              <label>
                Titulo
                <input name="eventTitle" required placeholder="Ej: After office Kreis" />
              </label>
              <label>
                Fecha
                <input name="eventDate" required type="date" />
              </label>
              <label>
                Lugar
                <input name="eventPlace" required placeholder="Ej: Terraza Lima" />
              </label>
              <label>
                Categoria
                <input name="eventCategory" required placeholder="Social, cultura, deporte..." />
              </label>
              <label>
                Descripcion
                <textarea name="eventDescription" required placeholder="Conta que va a pasar y por que vale la pena sumarse..." />
              </label>
            </>
          ) : (
            <>
              <label>
                Comunidad
                <select name="communityId">
                  {joined.map((community) => (
                    <option value={community.id} key={community.id}>{community.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Post
                <textarea name="postText" required placeholder="Conta que estas buscando, proponiendo o armando..." />
              </label>
            </>
          )}
          <button className="min-h-[42px] rounded-[14px] border-0 bg-kreis-orange px-4 font-black text-white shadow-none" type="submit">{submitLabel}</button>
        </form>
      </section>
    </div>
  );
}
