import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../../core/config";

export type AccessTokenVerification =
  | { ok: true; authId: string }
  | {
      ok: false;
      status: 401 | 503;
      error: {
        code: "invalid_token" | "auth_service_unavailable";
        message: string;
      };
    };

type CachedVerification = {
  authId: string;
  expiresAt: number;
};

const verificationCacheTtlMs = 5_000;
const maxCachedVerifications = 500;
const verificationCache = new Map<string, CachedVerification>();
const pendingVerifications = new Map<string, Promise<AccessTokenVerification>>();

const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function getTokenKey(accessToken: string): string {
  return createHash("sha256").update(accessToken).digest("base64url");
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function pruneVerificationCache(now: number): void {
  for (const [key, entry] of verificationCache) {
    if (entry.expiresAt <= now) verificationCache.delete(key);
  }

  while (verificationCache.size >= maxCachedVerifications) {
    const oldestKey = verificationCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    verificationCache.delete(oldestKey);
  }
}

function unavailableVerification(error: unknown): AccessTokenVerification {
  const status = getErrorStatus(error);

  console.warn("[auth] Supabase token verification unavailable", {
    status,
    errorName: error instanceof Error ? error.name : "UnknownError"
  });

  return {
    ok: false,
    status: 503,
    error: {
      code: "auth_service_unavailable",
      message: "No pudimos validar la sesion en este momento"
    }
  };
}

async function verifyUncachedAccessToken(
  accessToken: string,
  tokenKey: string
): Promise<AccessTokenVerification> {
  try {
    const { data, error } = await supabaseAuth.auth.getClaims(accessToken);

    if (error) {
      const status = getErrorStatus(error);
      if (status !== 400 && status !== 401 && status !== 403) {
        return unavailableVerification(error);
      }

      return {
        ok: false,
        status: 401,
        error: {
          code: "invalid_token",
          message: "Token invalido o expirado"
        }
      };
    }

    const authId = data?.claims.sub;
    if (typeof authId !== "string" || !authId) {
      return {
        ok: false,
        status: 401,
        error: {
          code: "invalid_token",
          message: "Token invalido o expirado"
        }
      };
    }

    const now = Date.now();
    const jwtExpiresAt = typeof data.claims.exp === "number"
      ? data.claims.exp * 1000
      : now + verificationCacheTtlMs;

    pruneVerificationCache(now);
    verificationCache.set(tokenKey, {
      authId,
      expiresAt: Math.min(now + verificationCacheTtlMs, jwtExpiresAt)
    });

    return { ok: true, authId };
  } catch (error) {
    return unavailableVerification(error);
  }
}

export async function verifyAccessToken(accessToken: string): Promise<AccessTokenVerification> {
  const tokenKey = getTokenKey(accessToken);
  const now = Date.now();
  const cached = verificationCache.get(tokenKey);

  if (cached && cached.expiresAt > now) {
    return { ok: true, authId: cached.authId };
  }

  if (cached) verificationCache.delete(tokenKey);

  const pending = pendingVerifications.get(tokenKey);
  if (pending) return pending;

  const verification = verifyUncachedAccessToken(accessToken, tokenKey).finally(() => {
    pendingVerifications.delete(tokenKey);
  });
  pendingVerifications.set(tokenKey, verification);

  return verification;
}
