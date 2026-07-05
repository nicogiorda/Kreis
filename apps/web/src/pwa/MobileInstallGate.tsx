import { type ReactNode, useEffect, useState } from "react";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const standaloneMediaQuery = "(display-mode: standalone)";
const mobileMediaQuery =
  "(max-width: 768px) and (pointer: coarse), (max-width: 1024px) and (hover: none) and (pointer: coarse)";

function isIOSDevice(navigatorValue: Navigator = navigator): boolean {
  return (
    /iPad|iPhone|iPod/i.test(navigatorValue.userAgent) ||
    (navigatorValue.platform === "MacIntel" &&
      navigatorValue.maxTouchPoints > 1)
  );
}

function isMobileDevice(
  navigatorValue: Navigator = navigator,
  windowValue: Window = window
): boolean {
  const mobileUserAgent =
    /Android.*Mobile|iPhone|iPad|iPod|Mobile Safari/i.test(
      navigatorValue.userAgent
    );

  return (
    isIOSDevice(navigatorValue) ||
    mobileUserAgent ||
    windowValue.matchMedia(mobileMediaQuery).matches
  );
}

function isStandaloneMode(
  navigatorValue: NavigatorWithStandalone = navigator,
  windowValue: Window = window
): boolean {
  return (
    windowValue.matchMedia(standaloneMediaQuery).matches ||
    navigatorValue.standalone === true
  );
}

export function MobileInstallGate({
  children
}: {
  children: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());
  const [isStandalone, setIsStandalone] = useState(() =>
    isStandaloneMode()
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const isIOS = isIOSDevice();

  useEffect(() => {
    const standaloneQuery = window.matchMedia(standaloneMediaQuery);
    const mobileQuery = window.matchMedia(mobileMediaQuery);

    function updateDisplayMode(): void {
      setIsStandalone(isStandaloneMode());
    }

    function updateMobileStatus(): void {
      setIsMobile(isMobileDevice());
    }

    function handleBeforeInstallPrompt(event: Event): void {
      if (isIOS) return;

      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled(): void {
      setDeferredPrompt(null);
      setIsInstalled(true);
      updateDisplayMode();
    }

    standaloneQuery.addEventListener("change", updateDisplayMode);
    mobileQuery.addEventListener("change", updateMobileStatus);
    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener("change", updateDisplayMode);
      mobileQuery.removeEventListener("change", updateMobileStatus);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isIOS]);

  async function installApp(): Promise<void> {
    if (!deferredPrompt || isIOS) return;

    const prompt = deferredPrompt;
    setDeferredPrompt(null);

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      if (choice.outcome === "accepted") setIsInstalled(true);
    } catch {
      // Browsers may withdraw an install prompt while it is being displayed.
    }
  }

  if (!isMobile || isStandalone) return children;

  return (
    <main className="mobile-install-gate">
      <section
        className="mobile-install-card"
        aria-labelledby="mobile-install-title"
      >
        <img
          className="mobile-install-icon"
          src="/icons/icono-app-192.png"
          alt=""
          width="96"
          height="96"
        />

        <h1 id="mobile-install-title">Instalá Kreis</h1>
        <p className="mobile-install-lead">
          Kreis está pensado para usarse como app. Instalalo en tu inicio para
          una mejor experiencia.
        </p>

        {!isIOS ? (
          <button
            className="mobile-install-button"
            type="button"
            disabled={!deferredPrompt || isInstalled}
            onClick={() => void installApp()}
          >
            {isInstalled ? "Kreis instalada" : "Instalar Kreis"}
          </button>
        ) : null}

        {isInstalled ? (
          <p className="mobile-install-status" role="status">
            La instalación está lista. Abrí Kreis desde el ícono de tu inicio.
          </p>
        ) : !isIOS ? (
          <p className="mobile-install-hint">
            Si no aparece el instalador, usá el menú del navegador y elegí
            Instalar app o Añadir a pantalla principal.
          </p>
        ) : null}

        {isIOS ? (
          <div className="mobile-install-ios">
            <h2>¿Tenés iPhone?</h2>
            <ol>
              <li>Abrí Kreis desde Safari.</li>
              <li>Tocá el botón Compartir.</li>
              <li>Elegí Añadir a inicio.</li>
              <li>Abrí Kreis desde el ícono.</li>
            </ol>
          </div>
        ) : null}
      </section>
    </main>
  );
}
