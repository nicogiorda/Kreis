import isotypeUrl from "../../assets/brand/svgs/ISOTIPO-INVERTIDO.svg";
import type { Screen } from "../../types";
import { cn } from "../../utils/cn";
import { navigationItems } from "./navigationItems";

type DesktopSidebarProps = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function DesktopSidebar({ screen, onNavigate }: DesktopSidebarProps) {
  return (
    <aside className="desktop-sidebar hidden lg:flex" aria-label="Navegacion principal">
      <div className="desktop-sidebar-brand" aria-label="Kreis">
        <img src={isotypeUrl} alt="" aria-hidden="true" />
        <span>kreis</span>
      </div>

      <nav className="desktop-sidebar-nav">
        {navigationItems.map(({ id, label, Icon }) => (
          <button
            className={cn("desktop-sidebar-link", screen === id && "is-active")}
            type="button"
            key={id}
            aria-current={screen === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={24} weight={screen === id ? "BoldDuotone" : "LineDuotone"} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
