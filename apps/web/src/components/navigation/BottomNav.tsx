import type { Screen } from "../../types";
import { cn } from "../../utils/cn";
import { navigationItems } from "./navigationItems";

type BottomNavProps = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function BottomNav({ screen, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav fixed inset-x-0 z-30 grid h-[calc(var(--nav-height)+env(safe-area-inset-bottom))] lg:hidden" aria-label="Navegacion principal">
      <div className="mx-auto grid h-full w-[min(346px,calc(100vw-46px))] grid-cols-4 gap-0">
        {navigationItems.map(({ id, label, Icon }) => (
          <button
            className={cn(
              "relative z-[1] grid min-h-[var(--nav-height)] min-w-0 place-items-start justify-items-center border-0 bg-transparent px-0 pb-[calc(9px+env(safe-area-inset-bottom))] pt-[19px] shadow-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95",
              screen === id ? "text-kreis-orange" : "text-[var(--bottom-nav-icon-muted)]"
            )}
            type="button"
            key={id}
            aria-label={label}
            aria-current={screen === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={28} weight="Bold" aria-hidden="true" />
          </button>
        ))}
      </div>
    </nav>
  );
}
