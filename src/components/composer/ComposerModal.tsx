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
    <div className="composer">
      <div className="composer-backdrop" onClick={onClose} />
      <section className="composer-sheet" role="dialog" aria-modal="true" aria-label={dialogLabel}>
        <div className="composer-grip" />
        <header className="composer-header">
          <div>
            <span className="menu-kicker">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Cerrar">x</button>
        </header>
        <form className="composer-form" onSubmit={handleSubmit}>
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
          <button className="primary-button" type="submit">{submitLabel}</button>
        </form>
      </section>
    </div>
  );
}
