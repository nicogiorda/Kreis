import isotypeUrl from "../../assets/brand/svgs/ISOTIPO-INVERTIDO.svg";
import { ThemeToggleIcon } from "../common/Icons";
import type { ThemeMode } from "../../types";

type HeaderProps = {
  globalQuery: string;
  themeMode: ThemeMode;
  onQueryChange: (query: string) => void;
  onToggleTheme: () => void;
};

export function Header({ globalQuery, themeMode, onQueryChange, onToggleTheme }: HeaderProps) {
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <header className="relative z-30 bg-kreis-green pt-[var(--header-main-height)] text-kreis-cream md:-mx-6">
      <div className="app-header-main fixed left-1/2 top-0 z-[35] w-[min(100%,1120px)] bg-kreis-green pb-2.5 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[calc(8px+env(safe-area-inset-top))] md:px-6">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_44px] items-center gap-2">
          <label className="header-glass-field global-search relative grid h-[46px] min-w-0 items-center p-0 shadow-none" aria-label="Buscar en Kreis">
            <img src={isotypeUrl} alt="" className="absolute left-[13px] top-1/2 z-[2] size-7 -translate-y-1/2 object-contain opacity-[0.98]" />
            <input
              className="relative z-[1] h-full min-w-0 appearance-none rounded-none border-0 bg-transparent py-0 pl-[58px] pr-[30px] text-center font-medium leading-[46px] text-kreis-cream outline-0 placeholder:font-medium placeholder:text-[rgba(247,237,218,0.76)]"
              value={globalQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              type="search"
              placeholder="Comienza a conectar"
            />
          </label>
          <button className="header-glass-button app-header-icon-button theme-toggle-button grid size-11 place-items-center text-kreis-cream shadow-none [&_svg]:size-[25px]" type="button" aria-label={nextThemeLabel} aria-pressed={themeMode === "dark"} onClick={onToggleTheme}>
            <ThemeToggleIcon themeMode={themeMode} />
          </button>
        </div>
      </div>
    </header>
  );
}
