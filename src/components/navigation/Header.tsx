import isotypeUrl from "../../assets/brand/svgs/ISOTIPO-INVERTIDO.svg";
import { MenuIcon, NotificationIcon } from "../common/Icons";
import type { HomeTab } from "../../types";
import { cn } from "../../utils/cn";

type HeaderProps = {
  globalQuery: string;
  homeTab: HomeTab;
  menuOpen: boolean;
  showHomeTabs: boolean;
  onHomeTab: (tab: HomeTab) => void;
  onQueryChange: (query: string) => void;
  onToggleMenu: () => void;
};

export function Header({ globalQuery, homeTab, menuOpen, showHomeTabs, onHomeTab, onQueryChange, onToggleMenu }: HeaderProps) {
  return (
    <header className="relative z-30 bg-kreis-orange pt-[var(--header-main-height)] text-kreis-cream md:-mx-6">
      <div className="app-header-main menu-shift fixed left-1/2 top-0 z-[35] w-[min(100%,1120px)] bg-kreis-orange pb-2.5 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[calc(8px+env(safe-area-inset-top))] transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:px-6">
        <div className="grid w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <button
            className="grid size-11 place-items-center border-0 bg-transparent text-kreis-cream shadow-none [&_svg]:size-[31px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.65] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"
            type="button"
            aria-label={menuOpen ? "Cerrar comunidades" : "Abrir comunidades"}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
          >
            <MenuIcon />
          </button>
          <label className="global-search relative grid h-[46px] min-w-0 items-center rounded-[26px] border border-[rgba(247,237,218,0.34)] bg-[rgba(247,237,218,0.15)] p-0 shadow-none focus-within:border-[rgba(247,237,218,0.72)] focus-within:bg-[rgba(247,237,218,0.2)]" aria-label="Buscar en Kreis">
            <img src={isotypeUrl} alt="" className="absolute left-[13px] top-1/2 z-[2] size-7 -translate-y-1/2 object-contain opacity-[0.98]" />
            <input
              className="relative z-[1] h-full min-w-0 appearance-none rounded-none border-0 bg-transparent py-0 pl-[58px] pr-[30px] text-center font-medium leading-[46px] text-kreis-cream outline-0 placeholder:font-medium placeholder:text-[rgba(247,237,218,0.76)]"
              value={globalQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              type="search"
              placeholder="Comienza a conectar"
            />
          </label>
          <button className="grid size-11 place-items-center rounded-[15px] border border-[rgba(247,237,218,0.44)] bg-[rgba(247,237,218,0.14)] text-kreis-cream shadow-none [&_svg]:size-[25px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.75] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]" type="button" aria-label="Notificaciones">
            <NotificationIcon />
          </button>
        </div>
      </div>
      {showHomeTabs ? (
        <div className="menu-shift bg-kreis-orange pb-[5px] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:px-6">
          <div className={cn("home-header-switch relative isolate grid w-full grid-cols-2 gap-px overflow-hidden rounded-[11px] border border-[rgba(247,237,218,0.34)] bg-[rgba(247,237,218,0.13)] p-px", homeTab === "communities" && "is-communities-active")} role="tablist" aria-label="Cambiar vista principal">
            <button
              className={cn("relative z-[1] grid min-h-[27px] min-w-0 place-items-center whitespace-nowrap rounded-[9px] border-0 bg-transparent px-2 text-center text-[0.84rem] font-medium tracking-normal transition-[color,transform] duration-200 ease-out active:scale-[0.98]", homeTab === "events" ? "text-kreis-orange" : "text-[rgba(247,237,218,0.84)]")}
              type="button"
              role="tab"
              aria-selected={homeTab === "events"}
              onClick={() => onHomeTab("events")}
            >
              Eventos
            </button>
            <button
              className={cn("relative z-[1] grid min-h-[27px] min-w-0 place-items-center whitespace-nowrap rounded-[9px] border-0 bg-transparent px-2 text-center text-[0.84rem] font-medium tracking-normal transition-[color,transform] duration-200 ease-out active:scale-[0.98]", homeTab === "communities" ? "text-kreis-orange" : "text-[rgba(247,237,218,0.84)]")}
              type="button"
              role="tab"
              aria-selected={homeTab === "communities"}
              onClick={() => onHomeTab("communities")}
            >
              Comunidades
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
