import logoUrl from "../../assets/brand/svgs/IMAGOTIPO.svg";
import type { Community } from "../../types";

type CommunityMenuProps = {
  menuOpen: boolean;
  communities: Community[];
  onOpenCommunity: () => void;
  onCreateEvent: () => void;
  onCreateCommunity: () => void;
};

export function CommunityMenu({ menuOpen, communities, onOpenCommunity, onCreateEvent, onCreateCommunity }: CommunityMenuProps) {
  const joined = communities.filter((community) => community.joined);
  const visibleCommunities = joined.slice(0, 3);
  const hasMoreCommunities = joined.length > visibleCommunities.length;

  return (
    <div className={`community-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <div className="drawer-brand">
        <img src={logoUrl} alt="Kreis" />
      </div>
      <div className="menu-create-actions">
        <button className="menu-create-row" type="button" onClick={onCreateEvent}>
          <span>+</span>
          Publicar un evento
        </button>
        <button className="menu-create-row" type="button" onClick={onCreateCommunity}>
          <span>+</span>
          Crear una comunidad
        </button>
      </div>
      <h2>Tus comunidades</h2>
      <div className="menu-community-list">
        {visibleCommunities.map((community) => (
          <button className="menu-community" type="button" key={community.id} onClick={onOpenCommunity}>
            <span className="community-avatar">{community.icon}</span>
            <strong>{community.name}</strong>
          </button>
        ))}
      </div>
      {hasMoreCommunities && (
        <button className="menu-more-button" type="button" onClick={onOpenCommunity}>
          Ver mas
        </button>
      )}
    </div>
  );
}
