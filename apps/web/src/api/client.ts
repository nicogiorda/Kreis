import { markStartup, updateStartupDebug } from "../startup/startup-debug";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

type ApiRequestKind = "default" | "health" | "upload";

type ApiRequestInit = RequestInit & {
  requestKind?: ApiRequestKind;
  retries?: number;
  timeoutMs?: number;
};

let firstApiRequestTracked = false;
let firstApiResponseTracked = false;

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export class ApiTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly path: string
  ) {
    super("La solicitud tardo demasiado.");
    this.name = "ApiTimeoutError";
  }
}

export class ApiNetworkError extends Error {
  constructor(
    public readonly path: string,
    cause?: unknown
  ) {
    super("No pudimos conectar con el servidor.");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

export function bearerTokenHeaders(accessToken?: string): HeadersInit | undefined {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

function getApiError(payload: ApiErrorPayload | null, status?: number): ApiRequestError {
  return new ApiRequestError(
    payload?.error?.code ?? "request_failed",
    payload?.error?.message ?? "No pudimos completar la solicitud.",
    status
  );
}

function getRequestMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

function getTimeoutMs(method: string, requestKind: ApiRequestKind): number {
  if (requestKind === "health") return 5_000;
  if (requestKind === "upload") return 30_000;

  return method === "GET" ? 15_000 : 20_000;
}

function getRetryCount(method: string, retries?: number): number {
  if (typeof retries === "number") return retries;

  return method === "GET" ? 2 : 0;
}

function getRetryDelayMs(attempt: number): number {
  return attempt === 0 ? 1_500 : 4_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createTimeoutSignal(initSignal: AbortSignal | null | undefined, timeoutMs: number, path: string): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(new ApiTimeoutError(timeoutMs, path)), timeoutMs);

  function abortFromParent(): void {
    controller.abort(initSignal?.reason);
  }

  initSignal?.addEventListener("abort", abortFromParent, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      initSignal?.removeEventListener("abort", abortFromParent);
    }
  };
}

function isTimeoutError(error: unknown, path: string): ApiTimeoutError | null {
  if (error instanceof ApiTimeoutError) return error;
  if (error instanceof DOMException && error.name === "TimeoutError") return new ApiTimeoutError(0, path);
  if (error instanceof DOMException && error.name === "AbortError") return null;

  return null;
}

async function fetchWithTimeout(path: string, init: ApiRequestInit): Promise<Response> {
  const method = getRequestMethod(init);
  const timeoutMs = init.timeoutMs ?? getTimeoutMs(method, init.requestKind ?? "default");
  const { signal, cleanup } = createTimeoutSignal(init.signal, timeoutMs, path);

  try {
    return await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal
    });
  } catch (error) {
    const timeoutError = signal.reason instanceof ApiTimeoutError
      ? signal.reason
      : isTimeoutError(error, path);

    if (timeoutError) throw timeoutError;
    if (init.signal?.aborted) throw error;

    throw new ApiNetworkError(path, error);
  } finally {
    cleanup();
  }
}

async function requestWithRetry<T>(path: string, init: ApiRequestInit, parseResponse: (response: Response) => Promise<T>): Promise<T> {
  const method = getRequestMethod(init);
  const maxRetries = getRetryCount(method, init.retries);
  let attempt = 0;
  let lastError: unknown;

  if (!firstApiRequestTracked) {
    firstApiRequestTracked = true;
    markStartup("first-api-request-start");
    updateStartupDebug({
      firstApiRequest: {
        path,
        method
      }
    });
  }

  while (attempt <= maxRetries) {
    try {
      const response = await fetchWithTimeout(path, init);
      if (!firstApiResponseTracked) {
        firstApiResponseTracked = true;
        markStartup("first-api-response");
        updateStartupDebug({
          firstApiResponse: {
            path,
            ok: response.ok,
            status: response.status
          }
        });
      }
      return await parseResponse(response);
    } catch (error) {
      lastError = error;

      if (!firstApiResponseTracked) {
        firstApiResponseTracked = true;
        markStartup("first-api-response");
        updateStartupDebug({
          firstApiResponse: {
            path,
            ok: false,
            error: error instanceof Error ? error.name : String(error)
          }
        });
      }

      if (init.signal?.aborted || attempt >= maxRetries || !(error instanceof ApiTimeoutError || error instanceof ApiNetworkError)) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt));
      attempt += 1;
    }
  }

  throw lastError;
}

export async function requestJson<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  return requestWithRetry(path, { ...init, headers }, async (response) => {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | T | null;

    if (!response.ok) {
      throw getApiError(payload as ApiErrorPayload | null, response.status);
    }

    return payload as T;
  });
}

export async function requestFormData<T>(path: string, formData: FormData, init?: Omit<ApiRequestInit, "body">): Promise<T> {
  return requestWithRetry(path, {
    ...init,
    method: init?.method ?? "POST",
    requestKind: init?.requestKind ?? "upload",
    body: formData
  }, async (response) => {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | T | null;

    if (!response.ok) {
      throw getApiError(payload as ApiErrorPayload | null, response.status);
    }

    return payload as T;
  });
}
