import { useEffect, useState } from "react";
import splashIsotypeUrl from "../../assets/brand/isotype-inverted-splash.svg";
import splashLogoUrl from "../../assets/brand/logo-inverted.png";

const SPLASH_DURATION_MS = 2180;
const REDUCED_MOTION_DURATION_MS = 720;

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("is-splashing");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(
      () => setVisible(false),
      prefersReducedMotion ? REDUCED_MOTION_DURATION_MS : SPLASH_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timeout);
      document.documentElement.classList.remove("is-splashing");
    };
  }, []);

  useEffect(() => {
    if (!visible) document.documentElement.classList.remove("is-splashing");
  }, [visible]);

  if (!visible) return null;

  return (
    <section className="splash-screen fixed bottom-0 left-0 right-0 z-[100] grid w-full place-items-center overflow-hidden bg-kreis-orange pb-[calc(24px+env(safe-area-inset-bottom))] pl-[calc(22px+env(safe-area-inset-left))] pr-[calc(22px+env(safe-area-inset-right))] text-[oklch(97%_0.025_76)] pointer-events-auto isolate" role="status" aria-label="Cargando Kreis">
      <div className="hidden" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="relative h-[clamp(190px,42vh,250px)] w-[min(100%,390px)] -translate-y-[1.5vh]">
        <div className="splash-mark-shell absolute left-1/2 top-1/2 z-[1] grid aspect-square w-[clamp(112px,30vw,152px)] place-items-center opacity-0 [transform:translate(-50%,-50%)_scale(0.68)_rotate(-8deg)]" aria-hidden="true">
          <img className="size-full scale-[1.08] object-contain" src={splashIsotypeUrl} alt="" />
        </div>
        <img className="splash-lockup absolute left-1/2 top-1/2 z-[2] h-auto w-[min(108vw,500px)] max-w-none opacity-0 [clip-path:inset(0_44%_0_44%)] [transform:translate(-50%,-46%)_scale(0.98)]" src={splashLogoUrl} alt="Kreis" />
      </div>
    </section>
  );
}
