import isotypeUrl from "../../assets/brand/svgs/ISOTIPO-INVERTIDO.svg";
import { MenuIcon, NotificationIcon } from "../common/Icons";
import type { HomeTab } from "../../types";

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
    <header className="app-header">
      <div className="app-header-main">
        <div className="command-bar">
          <button className="menu-button" type="button" aria-label="Abrir comunidades" aria-expanded={menuOpen} onClick={onToggleMenu}>
            <MenuIcon />
          </button>
          <label className="global-search" aria-label="Buscar en Kreis">
            <img src={isotypeUrl} alt="" className="search-isotype" />
            <input value={globalQuery} onChange={(event) => onQueryChange(event.target.value)} type="search" placeholder="Comienza a conectar" />
          </label>
          <button className="notification-button" type="button" aria-label="Notificaciones">
            <NotificationIcon />
          </button>
        </div>
      </div>
      {showHomeTabs ? (
        <div className="home-header-tabs">
          <div className={`home-header-switch ${homeTab === "communities" ? "is-communities-active" : "is-events-active"}`} role="tablist" aria-label="Cambiar vista principal">
            <button className={homeTab === "events" ? "is-active" : ""} type="button" role="tab" aria-selected={homeTab === "events"} onClick={() => onHomeTab("events")}>
              Eventos
            </button>
            <button className={homeTab === "communities" ? "is-active" : ""} type="button" role="tab" aria-selected={homeTab === "communities"} onClick={() => onHomeTab("communities")}>
              Comunidades
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
