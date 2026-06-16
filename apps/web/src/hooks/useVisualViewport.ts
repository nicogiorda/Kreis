import { useEffect, useState } from "react";

type VisualViewportState = {
  height: number;
  offsetTop: number;
  keyboardOpen: boolean;
};

function readVisualViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return {
      height: 0,
      offsetTop: 0,
      keyboardOpen: false
    };
  }

  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const keyboardInset = viewport ? window.innerHeight - viewport.height - viewport.offsetTop : 0;

  return {
    height,
    offsetTop,
    keyboardOpen: keyboardInset > 80
  };
}

function writeViewportVariables(state: VisualViewportState): void {
  if (typeof document === "undefined") return;

  document.documentElement.style.setProperty("--visual-viewport-height", `${state.height}px`);
  document.documentElement.style.setProperty("--visual-viewport-top", `${state.offsetTop}px`);
}

export function useVisualViewport(active = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => readVisualViewport());

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let frameId = 0;

    function update(): void {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextState = readVisualViewport();
        writeViewportVariables(nextState);
        setState(nextState);
      });
    }

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.documentElement.style.removeProperty("--visual-viewport-height");
      document.documentElement.style.removeProperty("--visual-viewport-top");
    };
  }, [active]);

  return state;
}
