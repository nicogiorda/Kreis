import { useEffect, useState } from "react";

type RectReport = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  overflow: string;
  overflowX: string;
  overflowY: string;
  position: string;
  paddingBottom: string;
  marginBottom: string;
} | null;

type ViewportSnapshot = {
  window: {
    innerWidth: number;
    innerHeight: number;
    screenWidth: number;
    screenHeight: number;
  };
  document: {
    documentElementClientHeight: number;
    bodyClientHeight: number;
  };
  visualViewport: {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
  } | null;
  standalone: {
    displayMode: boolean;
    navigatorStandalone: boolean;
  };
  authVisualBottomExtension: string;
  unitProbes: Record<string, number | null>;
  rects: Record<string, RectReport>;
};

const unitProbeValues = ["100vh", "100dvh", "100lvh", "100svh"] as const;

const rectSelectors = {
  html: "html",
  body: "body",
  root: "#root",
  authRoot: ".auth-stack-root",
  authShell: ".auth-redesign-shell",
  authScreen: ".auth-redesign-screen",
  authStage: ".auth-redesign-stage",
  authDecor: ".auth-redesign-decor-layer",
  authCharacter: ".auth-redesign-character-bg",
  splashScreen: ".splash-screen",
  splashLayoutFrame: ".splash-layout-frame"
} as const;

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("viewport-debug") === "1";
}

function getElement(selector: string): Element | null {
  if (selector === "html") return document.documentElement;
  if (selector === "body") return document.body;

  return document.querySelector(selector);
}

function readRect(selector: string): RectReport {
  const element = getElement(selector);
  if (!element) return null;

  const box = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  return {
    top: Math.round(box.top * 100) / 100,
    right: Math.round(box.right * 100) / 100,
    bottom: Math.round(box.bottom * 100) / 100,
    left: Math.round(box.left * 100) / 100,
    width: Math.round(box.width * 100) / 100,
    height: Math.round(box.height * 100) / 100,
    overflow: styles.overflow,
    overflowX: styles.overflowX,
    overflowY: styles.overflowY,
    position: styles.position,
    paddingBottom: styles.paddingBottom,
    marginBottom: styles.marginBottom
  };
}

function readProbeHeight(value: string): number | null {
  const probe = document.querySelector(`[data-auth-viewport-probe="${value}"]`);
  if (!probe) return null;

  return Math.round(probe.getBoundingClientRect().height * 100) / 100;
}

function readSnapshot(): ViewportSnapshot {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const visualViewport = window.visualViewport;

  return {
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    },
    document: {
      documentElementClientHeight: document.documentElement.clientHeight,
      bodyClientHeight: document.body.clientHeight
    },
    visualViewport: visualViewport
      ? {
          width: Math.round(visualViewport.width * 100) / 100,
          height: Math.round(visualViewport.height * 100) / 100,
          offsetTop: Math.round(visualViewport.offsetTop * 100) / 100,
          offsetLeft: Math.round(visualViewport.offsetLeft * 100) / 100
        }
      : null,
    standalone: {
      displayMode: window.matchMedia("(display-mode: standalone)").matches,
      navigatorStandalone: standaloneNavigator.standalone === true
    },
    authVisualBottomExtension: rootStyles.getPropertyValue("--auth-visual-bottom-extension").trim() || "not-set",
    unitProbes: Object.fromEntries(unitProbeValues.map((value) => [value, readProbeHeight(value)])),
    rects: Object.fromEntries(
      Object.entries(rectSelectors).map(([key, selector]) => [key, readRect(selector)])
    )
  };
}

export function ViewportDebugPanel() {
  const enabled = isEnabled();
  const [snapshot, setSnapshot] = useState<ViewportSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let frameId = 0;

    function update(): void {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => setSnapshot(readSnapshot()));
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {unitProbeValues.map((value) => (
        <div
          data-auth-viewport-probe={value}
          key={value}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: 1,
            height: value,
            pointerEvents: "none",
            visibility: "hidden"
          }}
        />
      ))}
      <pre
        aria-label="Viewport debug"
        style={{
          position: "fixed",
          left: 8,
          right: 8,
          bottom: 8,
          zIndex: 2147483647,
          maxHeight: "46vh",
          overflow: "auto",
          borderRadius: 10,
          margin: 0,
          padding: 10,
          background: "rgba(0, 0, 0, 0.84)",
          color: "#f7edda",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 10,
          lineHeight: 1.35,
          whiteSpace: "pre-wrap"
        }}
      >
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </>
  );
}
