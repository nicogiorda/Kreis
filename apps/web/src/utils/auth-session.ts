import type { AuthResult } from "../api/auth";

const authStorageKey = "kreis-auth-session-v1";
export const authRefreshLeadMs = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthResult(value: unknown): value is AuthResult {
  if (!isRecord(value) || !isRecord(value.session) || !isRecord(value.user)) return false;

  return typeof value.session.access_token === "string" && typeof value.user.id === "string";
}

export function readStoredAuthSession(): AuthResult | null {
  if (typeof window === "undefined") return null;

  try {
    const rawSession = window.localStorage.getItem(authStorageKey);
    if (!rawSession) return null;

    const parsedSession = JSON.parse(rawSession) as unknown;
    return isAuthResult(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

export function storeAuthSession(auth: AuthResult): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(authStorageKey, JSON.stringify(auth));
  } catch {
    // Storage can fail in private modes; the active in-memory session still works.
  }
}

export function clearStoredAuthSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(authStorageKey);
  } catch {
    // Nothing else to do if storage is unavailable.
  }
}

export function getAuthSessionExpiryMs(auth: AuthResult): number | null {
  const expiresAt = auth.session.expires_at;
  return typeof expiresAt === "number" ? expiresAt * 1000 : null;
}

export function shouldRefreshAuthSession(auth: AuthResult): boolean {
  const expiryMs = getAuthSessionExpiryMs(auth);
  if (expiryMs === null) return false;

  return expiryMs <= Date.now() + authRefreshLeadMs;
}

export function isAuthSessionExpired(auth: AuthResult): boolean {
  const expiryMs = getAuthSessionExpiryMs(auth);
  if (expiryMs === null) return false;

  return expiryMs <= Date.now();
}
