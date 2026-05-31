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

export type TopicCatalogItem = {
  id_topico: string;
  topico: string;
};

export type FacultyCatalogItem = {
  id_facultad: string;
  nombre: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  legajo: number;
  nombre: string;
  apellido: string;
  id_facultad: number;
  topicos: number[];
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  [key: string]: unknown;
};

export type AuthResult = {
  session: AuthSession;
  user: {
    id: string;
    email?: string;
  };
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
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

export async function listTopics(signal?: AbortSignal): Promise<TopicCatalogItem[]> {
  const response = await requestJson<{ topicos: TopicCatalogItem[] }>("/api/v1/users/topicos", { signal });
  return response.topicos;
}

export async function listFaculties(signal?: AbortSignal): Promise<FacultyCatalogItem[]> {
  const response = await requestJson<{ facultades: FacultyCatalogItem[] }>("/api/v1/users/facultades", { signal });
  return response.facultades;
}

export async function register(input: RegisterInput): Promise<void> {
  await requestJson("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return requestJson<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}
