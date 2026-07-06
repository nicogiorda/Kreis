import { createHmac } from "node:crypto";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../../../core/config";
import {
  createRateLimitStore,
  loginEmailRateLimitPrefix,
  loginIpRateLimitPrefix
} from "../../../core/rate-limit-store";
import { getCertificateRateLimitClientIp } from "./certificate-rate-limit";

export const loginRateLimitWindowMs = 15 * 60 * 1000;
export const loginIpRateLimitLimit = 30;
export const loginEmailRateLimitLimit = 5;

export const loginRateLimitMessage = {
  error: {
    code: "login_rate_limited",
    message: "Demasiados intentos de inicio de sesion. Intenta nuevamente en unos minutos."
  }
};

const developmentRateLimitSecret =
  "development-only-rate-limit-secret-do-not-use-in-production";
const rateLimitSecret =
  config.RATE_LIMIT_KEY_SECRET ?? developmentRateLimitSecret;

function getIpKey(request: Request): string {
  return ipKeyGenerator(getCertificateRateLimitClientIp(request));
}

export function getHashedLoginEmailKey(request: Request): string {
  const email =
    typeof request.body?.email === "string"
      ? request.body.email.trim().toLowerCase()
      : "";
  const keySource = email || `invalid:${getIpKey(request)}`;

  return createHmac("sha256", rateLimitSecret)
    .update(keySource)
    .digest("hex");
}

function createLoginLimiter(
  prefix: string,
  limit: number,
  keyGenerator: (request: Request) => string
) {
  return rateLimit({
    windowMs: loginRateLimitWindowMs,
    store: createRateLimitStore(prefix),
    passOnStoreError: false,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator,
    message: loginRateLimitMessage
  });
}

export function createLoginRateLimits() {
  return [
    createLoginLimiter(loginIpRateLimitPrefix, loginIpRateLimitLimit, getIpKey),
    createLoginLimiter(
      loginEmailRateLimitPrefix,
      loginEmailRateLimitLimit,
      getHashedLoginEmailKey
    )
  ];
}

export const loginRateLimits = createLoginRateLimits();
