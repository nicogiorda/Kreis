import logoUrl from "../../assets/brand/svgs/IMAGOTIPO.svg";
import type { Community } from "../../types";
import { cn } from "../../utils/cn";

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
    <div
      className={cn(
        "fixed bottom-0 left-0 top-0 z-40 w-[var(--drawer-width)] overflow-y-auto border-r border-[rgba(9,51,44,0.12)] bg-kreis-app-bg px-3.5 pb-[calc(var(--nav-height)+18px)] pt-[18px] shadow-[16px_0_40px_rgba(32,20,13,0.16)] transition-[transform,opacity,visibility] duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        menuOpen ? "visible translate-x-0 opacity-100 pointer-events-auto" : "invisible translate-x-[calc(-100%-18px)] opacity-0 pointer-events-none"
      )}
      aria-hidden={!menuOpen}
    >
      <div className="mb-6 flex items-center">
        <img className="h-auto w-[clamp(132px,49%,164px)] object-contain" src={logoUrl} alt="Kreis" />
      </div>
      <div className="mb-[18px] grid gap-0.5 border-b border-[rgba(31,24,19,0.1)] pb-3.5">
        <button className="flex min-h-11 w-full items-center gap-2.5 rounded-none border-0 bg-transparent px-0.5 text-left font-medium leading-none text-kreis-ink" type="button" onClick={onCreateEvent}>
          <span className="grid size-[22px] flex-none place-items-center bg-transparent text-[1.3rem] font-normal leading-none text-current">+</span>
          Publicar un evento
        </button>
        <button className="flex min-h-11 w-full items-center gap-2.5 rounded-none border-0 bg-transparent px-0.5 text-left font-medium leading-none text-kreis-ink" type="button" onClick={onCreateCommunity}>
          <span className="grid size-[22px] flex-none place-items-center bg-transparent text-[1.3rem] font-normal leading-none text-current">+</span>
          Crear una comunidad
        </button>
      </div>
      <h2 className="mb-0 mt-[18px] text-[1.05rem] font-medium leading-none text-kreis-ink">Tus comunidades</h2>
      <div className="my-3.5 mb-2.5 grid gap-1.5">
        {visibleCommunities.map((community) => (
          <button className="grid min-h-[58px] w-full grid-cols-[42px_minmax(0,1fr)] items-center gap-[11px] rounded-none border-0 bg-transparent px-0.5 py-1.5 text-left text-kreis-ink" type="button" key={community.id} onClick={onOpenCommunity}>
            <span className="grid size-[42px] place-items-center rounded-full bg-kreis-beige text-base font-black text-kreis-orange">{community.icon}</span>
            <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[0.98rem] font-bold leading-[1.15]">{community.name}</strong>
          </button>
        ))}
      </div>
      {hasMoreCommunities && (
        <button className="min-h-11 w-full rounded-none border-0 bg-transparent px-0.5 text-left font-bold text-kreis-orange" type="button" onClick={onOpenCommunity}>
          Ver mas
        </button>
      )}
    </div>
  );
}
