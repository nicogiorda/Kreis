import { NavIcon } from "../common/Icons";
import type { Screen } from "../../types";
import { cn } from "../../utils/cn";

const navItems: Array<{ id: Screen; label: string }> = [
  { id: "home", label: "Home" },
  { id: "events", label: "Eventos" },
  { id: "communities", label: "Comunidades" },
  { id: "profile", label: "Perfil" }
];

type BottomNavProps = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function BottomNav({ screen, onNavigate }: BottomNavProps) {
  return (
    <nav className="menu-shift fixed inset-x-0 bottom-0 z-20 mx-auto grid min-h-[var(--nav-height)] w-full grid-cols-4 gap-0 border-t border-[rgba(31,24,19,0.1)] bg-white/95 pb-[max(14px,env(safe-area-inset-bottom))] pl-[max(8px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] pt-2 shadow-kreis-bottom-nav backdrop-blur-[18px] transition-transform duration-[760ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform" aria-label="Navegacion principal">
      {navItems.map((item) => (
        <button
          className={cn(
            "grid min-h-[62px] min-w-0 translate-y-[-6px] place-items-center content-center gap-0 rounded-none border-0 bg-transparent text-[0.68rem] font-semibold max-[380px]:text-[0.62rem]",
            screen === item.id ? "text-kreis-orange" : "text-kreis-muted"
          )}
          type="button"
          key={item.id}
          aria-label={item.label}
          onClick={() => onNavigate(item.id)}
        >
          <NavIcon active={screen === item.id} type={item.id} />
          <span className="mt-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
