import { useEffect, useState } from "react";
import splashIsotypeUrl from "../../assets/brand/isotype-inverted-splash.svg";
import splashLogoUrl from "../../assets/brand/logo-inverted.png";

const SPLASH_DURATION_MS = 2180;
const REDUCED_MOTION_DURATION_MS = 720;

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(
      () => setVisible(false),
      prefersReducedMotion ? REDUCED_MOTION_DURATION_MS : SPLASH_DURATION_MS,
    );

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <section className="splash-screen" role="status" aria-label="Cargando Kreis">
      <div className="splash-routes" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="splash-brand">
        <div className="splash-mark-shell" aria-hidden="true">
          <img className="splash-mark" src={splashIsotypeUrl} alt="" />
        </div>
        <img className="splash-lockup" src={splashLogoUrl} alt="Kreis" />
      </div>
    </section>
  );
}
