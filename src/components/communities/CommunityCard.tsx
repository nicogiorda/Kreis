import type { Community } from "../../types";

type CommunityCardProps = {
  community: Community;
  mode?: "discover" | "joined";
  onToggleJoin: (communityId: string) => void;
};

export function CommunityCard({ community, mode = "discover", onToggleJoin }: CommunityCardProps) {
  return (
    <article className={`community-card card ${mode === "joined" ? "is-owned" : ""}`}>
      <div className="community-card-top">
        <div className="community-identity">
          <span className="community-avatar">{community.icon}</span>
          <div className="community-title-group">
            <h3>{community.name}</h3>
            <span>{community.members} miembros</span>
          </div>
        </div>
        <button className={`join-button ${community.joined ? "is-joined" : ""}`} type="button" onClick={() => onToggleJoin(community.id)}>
          {community.joined ? "Unido" : "Unirme"}
        </button>
      </div>
      <p className="community-description">{community.description ?? community.pulse}</p>
    </article>
  );
}
