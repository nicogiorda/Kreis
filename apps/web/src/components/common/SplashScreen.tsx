import { useEffect } from "react";
import type { AnimationEvent } from "react";
import splashIsotypeUrl from "../../assets/brand/isotype-inverted-splash.svg";
import splashLogoUrl from "../../assets/brand/logo-inverted.png";
import { markStartup } from "../../startup/startup-debug";

export type SplashPhase = "intro" | "holding" | "exiting";

type SplashScreenProps = {
  phase: SplashPhase;
  onExitComplete: () => void;
};

function clearFirstPaintFallback(): void {
  document.getElementById("kreis-first-paint")?.remove();
}

export function SplashScreen({ phase, onExitComplete }: SplashScreenProps) {
  useEffect(() => {
    const firstPaintFrame = window.requestAnimationFrame(() => {
      clearFirstPaintFallback();
    });

    markStartup("splash-mounted");

    return () => {
      window.cancelAnimationFrame(firstPaintFrame);
      clearFirstPaintFallback();
    };
  }, []);

  function handleExitAnimationEnd(event: AnimationEvent<HTMLElement>): void {
    if (event.currentTarget !== event.target) return;
    if (phase !== "exiting") return;

    markStartup("splash-exit-end");
    onExitComplete();
  }

  return (
    <section className={`splash-screen splash-screen--${phase} fixed left-0 top-0 z-[100] w-full overflow-hidden bg-kreis-orange text-[oklch(97%_0.025_76)] pointer-events-auto isolate`} role="status" aria-label="Cargando Kreis" onAnimationEnd={handleExitAnimationEnd}>
      <div className="splash-layout-frame">
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
      </div>
    </section>
  );
}
