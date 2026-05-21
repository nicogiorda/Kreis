import fondoUadeDarkUrl from "../../assets/brand/fondo-uade-dark.webp";
import fondoUadeLightUrl from "../../assets/brand/fondo-uade-light.webp";
import { ThemeToggleIcon } from "../common/Icons";
import type { ThemeMode } from "../../types";

type HeroBannerProps = {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
};

export function HeroBanner({ themeMode, onToggleTheme }: HeroBannerProps) {
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  const heroImageUrl = themeMode === "dark" ? fondoUadeDarkUrl : fondoUadeLightUrl;

  return (
    <section className="home-hero-banner relative isolate w-full overflow-hidden shadow-none" aria-label="Kreis">
      <img className="home-hero-bg" src={heroImageUrl} alt="" aria-hidden="true" loading="eager" decoding="async" />
      <div className="home-hero-frame">
        <button
          className="home-mode-button theme-toggle-button"
          type="button"
          aria-label={nextThemeLabel}
          aria-pressed={themeMode === "dark"}
          onClick={onToggleTheme}
        >
          <ThemeToggleIcon themeMode={themeMode} />
        </button>
      </div>
    </section>
  );
}
