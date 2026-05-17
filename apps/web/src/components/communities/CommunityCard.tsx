import type { Community } from "../../types";
import { cn } from "../../utils/cn";

type CommunityCardProps = {
  community: Community;
  mode?: "discover" | "joined";
  onToggleJoin: (communityId: string) => void;
};

export function CommunityCard({ community, mode = "discover", onToggleJoin }: CommunityCardProps) {
  return (
    <article className={cn("grid items-start gap-2 rounded-kreis-card p-[11px_12px] shadow-none", mode === "joined" ? "bg-kreis-surface" : "bg-kreis-event-surface")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
        <div className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-2.5">
          <span className="grid size-[38px] place-items-center rounded-full bg-kreis-beige text-[0.88rem] font-black text-kreis-orange">{community.icon}</span>
          <div className="min-w-0">
            <h3 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1.06rem] font-semibold">{community.name}</h3>
            <span className="mt-0.5 block text-[0.68rem] font-medium leading-none text-kreis-muted">{community.members} miembros</span>
          </div>
        </div>
        <button
          className={cn(
            "min-h-[34px] rounded-full border-0 px-3 text-[0.82rem] font-semibold text-white shadow-none",
            community.joined ? "bg-kreis-forest" : "bg-kreis-orange"
          )}
          type="button"
          onClick={() => onToggleJoin(community.id)}
        >
          {community.joined ? "Unido" : "Unirme"}
        </button>
      </div>
      <p className="m-0 line-clamp-2 overflow-hidden text-[0.82rem] leading-[1.28] text-kreis-muted">{community.description ?? community.pulse}</p>
    </article>
  );
}
