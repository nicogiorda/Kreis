import type { FormEvent } from "react";
import type { Community, ComposerMode, CreateCommunityInput, CreatePostInput } from "../../types";

type ComposerModalProps = {
  open: boolean;
  mode: ComposerMode;
  communities: Community[];
  onClose: () => void;
  onCreateCommunity: (input: CreateCommunityInput) => void;
  onCreatePost: (input: CreatePostInput) => void;
};

function getFormValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export function ComposerModal({ open, mode, communities, onClose, onCreateCommunity, onCreatePost }: ComposerModalProps) {
  if (!open) return null;

  const joined = communities.filter((community) => community.joined);
  const isCommunity = mode === "community";

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

    onCreatePost({
      communityId: getFormValue(formData, "communityId"),
      postText: getFormValue(formData, "postText")
    });
  }

  return (
    <div className="composer">
      <div className="composer-backdrop" onClick={onClose} />
      <section className="composer-sheet" role="dialog" aria-modal="true" aria-label={isCommunity ? "Crear comunidad" : "Crear post"}>
        <div className="composer-grip" />
        <header className="composer-header">
          <div>
            <span className="menu-kicker">{isCommunity ? "Nuevo circulo" : "Nuevo post"}</span>
            <h2>{isCommunity ? "Crear comunidad" : "Publicar en una comunidad"}</h2>
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
          <button className="primary-button" type="submit">{isCommunity ? "Crear comunidad" : "Publicar"}</button>
        </form>
      </section>
    </div>
  );
}
