import logoUrl from "../../assets/brand/logo.png";
import type { Community } from "../../types";

type CommunityMenuProps = {
  menuOpen: boolean;
  communities: Community[];
  onOpenCommunity: () => void;
  onCreateCommunity: () => void;
};

export function CommunityMenu({ menuOpen, communities, onOpenCommunity, onCreateCommunity }: CommunityMenuProps) {
  const joined = communities.filter((community) => community.joined);
  const visibleCommunities = joined.slice(0, 3);
  const hasMoreCommunities = joined.length > visibleCommunities.length;

  return (
    <div className={`community-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <div className="drawer-brand">
        <img src={logoUrl} alt="Kreis" />
      </div>
      <button className="create-community-row" type="button" onClick={onCreateCommunity}>
        <span>+</span>
        Crear una comunidad
      </button>
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
