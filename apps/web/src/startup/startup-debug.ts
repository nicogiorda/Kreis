type StartupMarkName =
  | "app-script-start"
  | "react-mounted"
  | "splash-mounted"
  | "auth-init-start"
  | "auth-init-end"
  | "splash-minimum-finished"
  | "splash-exit-start"
  | "splash-exit-end"
  | "app-shell-mounted"
  | "first-api-request-start"
  | "first-api-response"
  | "service-worker-register-start"
  | "service-worker-register-end";

export type StartupDebugSnapshot = {
  marks: Partial<Record<StartupMarkName, number>>;
  authStatus?: string;
  splashPhase?: string;
  appShellMounted: boolean;
  firstApiRequest?: {
    path: string;
    method: string;
  };
  firstApiResponse?: {
    path: string;
    ok: boolean;
    status?: number;
    error?: string;
  };
  serviceWorker: {
    registerStarted: boolean;
    registerFinished: boolean;
    updateAvailable: boolean;
    error?: string;
  };
  globalError?: string;
};

const snapshot: StartupDebugSnapshot = {
  marks: {},
  appShellMounted: false,
  serviceWorker: {
    registerStarted: false,
    registerFinished: false,
    updateAvailable: false
  }
};

const subscribers = new Set<() => void>();

export function isStartupDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("startup-debug") === "1";
}

export function markStartup(name: StartupMarkName): void {
  if (typeof performance === "undefined") return;

  try {
    performance.mark(name);
    snapshot.marks[name] = Math.round(performance.now() * 100) / 100;
    emitStartupDebugChange();
  } catch {
    // Startup marks are diagnostic only.
  }
}

export function measureStartup(name: string, start: StartupMarkName, end: StartupMarkName): void {
  if (typeof performance === "undefined") return;

  try {
    performance.measure(name, start, end);
  } catch {
    // Missing marks should never affect the app.
  }
}

export function updateStartupDebug(nextSnapshot: Partial<StartupDebugSnapshot>): void {
  if (nextSnapshot.marks) {
    snapshot.marks = {
      ...snapshot.marks,
      ...nextSnapshot.marks
    };
  }

  if (nextSnapshot.serviceWorker) {
    snapshot.serviceWorker = {
      ...snapshot.serviceWorker,
      ...nextSnapshot.serviceWorker
    };
  }

  Object.assign(snapshot, {
    ...nextSnapshot,
    marks: snapshot.marks,
    serviceWorker: snapshot.serviceWorker
  });

  emitStartupDebugChange();
}

export function readStartupDebugSnapshot(): StartupDebugSnapshot {
  return {
    ...snapshot,
    marks: { ...snapshot.marks },
    serviceWorker: { ...snapshot.serviceWorker },
    firstApiRequest: snapshot.firstApiRequest ? { ...snapshot.firstApiRequest } : undefined,
    firstApiResponse: snapshot.firstApiResponse ? { ...snapshot.firstApiResponse } : undefined
  };
}

export function subscribeStartupDebug(listener: () => void): () => void {
  subscribers.add(listener);

  return () => subscribers.delete(listener);
}

export function installGlobalStartupErrorListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    updateStartupDebug({
      globalError: event.error instanceof Error ? event.error.message : event.message
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    updateStartupDebug({
      globalError: reason instanceof Error ? reason.message : String(reason)
    });
  });
}

function emitStartupDebugChange(): void {
  subscribers.forEach((listener) => listener());
}
