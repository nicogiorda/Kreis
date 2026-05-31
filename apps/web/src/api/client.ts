const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function bearerTokenHeaders(accessToken?: string): HeadersInit | undefined {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers
  });

  const payload = await response.json().catch(() => null) as ApiErrorPayload | T | null;

  if (!response.ok) {
    const error = payload as ApiErrorPayload | null;
    throw new ApiRequestError(
      error?.error?.code ?? "request_failed",
      error?.error?.message ?? "No pudimos completar la solicitud."
    );
  }

  return payload as T;
}
