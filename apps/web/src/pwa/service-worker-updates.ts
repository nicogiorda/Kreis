import { registerSW } from "virtual:pwa-register";
import { markStartup, updateStartupDebug } from "../startup/startup-debug";

type ServiceWorkerUpdateState = {
  updateAvailable: boolean;
  registrationFinished: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();

let state: ServiceWorkerUpdateState = {
  updateAvailable: false,
  registrationFinished: false,
  error: null
};
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registrationStarted = false;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(nextState: Partial<ServiceWorkerUpdateState>): void {
  state = {
    ...state,
    ...nextState
  };

  updateStartupDebug({
    serviceWorker: {
      registerFinished: state.registrationFinished,
      registerStarted: registrationStarted,
      updateAvailable: state.updateAvailable,
      error: state.error ?? undefined
    }
  });
  emit();
}

export function readServiceWorkerUpdateState(): ServiceWorkerUpdateState {
  return state;
}

export function subscribeServiceWorkerUpdates(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function startServiceWorkerRegistration(): void {
  if (registrationStarted || !("serviceWorker" in navigator)) return;

  registrationStarted = true;
  markStartup("service-worker-register-start");
  updateStartupDebug({
    serviceWorker: {
      registerStarted: true,
      registerFinished: false,
      updateAvailable: false
    }
  });

  try {
    updateServiceWorker = registerSW({
      immediate: false,
      onRegisteredSW() {
        markStartup("service-worker-register-end");
        setState({ registrationFinished: true });
      },
      onRegisterError(error) {
        markStartup("service-worker-register-end");
        setState({
          error: error instanceof Error ? error.message : String(error),
          registrationFinished: true
        });
      },
      onNeedRefresh() {
        setState({ updateAvailable: true });
      }
    });
  } catch (error) {
    markStartup("service-worker-register-end");
    setState({
      error: error instanceof Error ? error.message : String(error),
      registrationFinished: true
    });
  }
}

export async function applyPendingServiceWorkerUpdate(): Promise<void> {
  if (!updateServiceWorker) return;

  await updateServiceWorker(true);
}

export function dismissPendingServiceWorkerUpdate(): void {
  setState({ updateAvailable: false });
}
