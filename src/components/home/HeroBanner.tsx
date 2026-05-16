import isotypeUrl from "../../assets/brand/svgs/ISOTIPO-INVERTIDO.svg";
import kreisitoUrl from "../../assets/characters/kreisito_saludando.webp";
import { HeaderActionIcon, ThemeToggleIcon } from "../common/Icons";
import type { ThemeMode } from "../../types";

type HeroBannerProps = {
  menuOpen: boolean;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
};

export function HeroBanner({ menuOpen, themeMode, onToggleTheme, onToggleMenu }: HeroBannerProps) {
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <section className="relative isolate -mx-[var(--page-gutter)] h-[309px] w-[calc(100%+(var(--page-gutter)*2))] overflow-hidden bg-kreis-green text-kreis-cream shadow-none" aria-label="Kreis">
      <div className="home-hero-frame">
        <button
          className="header-glass-button home-header-control home-header-brand"
          type="button"
          aria-label={menuOpen ? "Cerrar comunidades" : "Abrir comunidades"}
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <img src={isotypeUrl} alt="" aria-hidden="true" />
        </button>
        <button
          className="header-glass-button home-header-control home-header-theme theme-toggle-button"
          type="button"
          aria-label={nextThemeLabel}
          aria-pressed={themeMode === "dark"}
          onClick={onToggleTheme}
        >
          <ThemeToggleIcon themeMode={themeMode} />
        </button>
        <button
          className="header-glass-button home-header-control home-header-action"
          type="button"
          aria-label="Abrir comunidades"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <HeaderActionIcon />
        </button>
        <div className="home-hero-copy">
          <h1 className="m-0 text-[48px] leading-[50px] tracking-normal text-kreis-cream">
            <span className="hero-banner-title block">Hola,</span>
            <span className="hero-banner-name block">Nicolás</span>
          </h1>
        </div>
        <img className="home-hero-character" src={kreisitoUrl} alt="" aria-hidden="true" />
      </div>
    </section>
  );
}
