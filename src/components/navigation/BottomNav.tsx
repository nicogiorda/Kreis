import { NavIcon } from "../common/Icons";
import type { Screen } from "../../types";
import { cn } from "../../utils/cn";

const navItems: Array<{ id: Screen; label: string }> = [
  { id: "home", label: "Inicio" },
  { id: "events", label: "Eventos" },
  { id: "communities", label: "Comunidades" },
  { id: "profile", label: "Perfil" }
];

type BottomNavProps = {
  screen: Screen;
  menuOpen: boolean;
  onNavigate: (screen: Screen) => void;
};

export function BottomNav({ screen, menuOpen, onNavigate }: BottomNavProps) {
  return (
    <>
      <div className={cn("bottom-nav-scrim fixed inset-x-0 bottom-0 z-20 h-[113px] pointer-events-none transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)]", menuOpen && "is-menu-open")} aria-hidden="true" />
      <nav className={cn("bottom-nav fixed left-1/2 z-30 grid h-[61px] w-[min(calc(100%_-_45px),348px)] grid-cols-4 gap-0 rounded-[30.5px] transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)]", menuOpen && "is-menu-open")} aria-label="Navegación principal">
        {navItems.map((item) => (
          <button
            className={cn(
              "relative z-[1] isolate grid min-h-[61px] min-w-0 place-items-center rounded-[29px] border-0 bg-transparent p-0 shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
              screen === item.id ? "text-kreis-orange" : "text-kreis-muted"
            )}
            type="button"
            key={item.id}
            aria-label={item.label}
            aria-current={screen === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <NavIcon active={screen === item.id} type={item.id} />
          </button>
        ))}
      </nav>
    </>
  );
}
