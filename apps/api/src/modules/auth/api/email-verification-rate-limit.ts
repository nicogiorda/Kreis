import { createHmac } from "node:crypto";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../../../core/config";
import {
  createRateLimitStore,
  registrationEmailStartEmailRateLimitPrefix,
  registrationEmailStartIpRateLimitPrefix,
  registrationEmailVerifyEmailRateLimitPrefix,
  registrationEmailVerifyIpRateLimitPrefix
} from "../../../core/rate-limit-store";
import { getCertificateRateLimitClientIp } from "./certificate-rate-limit";

export const registrationEmailRateLimitWindowMs = 60 * 60 * 1000;
export const registrationEmailStartIpLimit = 10;
export const registrationEmailStartEmailLimit = 3;
export const registrationEmailVerifyIpLimit = 30;
export const registrationEmailVerifyEmailLimit = 10;

const developmentRateLimitSecret =
  "development-only-rate-limit-secret-do-not-use-in-production";
const rateLimitSecret =
  config.RATE_LIMIT_KEY_SECRET ?? developmentRateLimitSecret;

function getIpKey(request: Request): string {
  return ipKeyGenerator(getCertificateRateLimitClientIp(request));
}

export function getHashedRegistrationEmailKey(request: Request): string {
  const email =
    typeof request.body?.email === "string"
      ? request.body.email.trim().toLowerCase()
      : "";
  const keySource = email || `invalid:${getIpKey(request)}`;

  return createHmac("sha256", rateLimitSecret)
    .update(keySource)
    .digest("hex");
}

function createLimiter(
  prefix: string,
  limit: number,
  keyGenerator: (request: Request) => string
) {
  return rateLimit({
    windowMs: registrationEmailRateLimitWindowMs,
    store: createRateLimitStore(prefix),
    passOnStoreError: false,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: {
      error: {
        code: "email_verification_rate_limited",
        message: "Demasiados intentos. Intenta nuevamente mas tarde."
      }
    }
  });
}

export function createRegistrationEmailStartRateLimits() {
  return [
    createLimiter(
      registrationEmailStartIpRateLimitPrefix,
      registrationEmailStartIpLimit,
      getIpKey
    ),
    createLimiter(
      registrationEmailStartEmailRateLimitPrefix,
      registrationEmailStartEmailLimit,
      getHashedRegistrationEmailKey
    )
  ];
}

export function createRegistrationEmailVerifyRateLimits() {
  return [
    createLimiter(
      registrationEmailVerifyIpRateLimitPrefix,
      registrationEmailVerifyIpLimit,
      getIpKey
    ),
    createLimiter(
      registrationEmailVerifyEmailRateLimitPrefix,
      registrationEmailVerifyEmailLimit,
      getHashedRegistrationEmailKey
    )
  ];
}

export const registrationEmailStartRateLimits =
  createRegistrationEmailStartRateLimits();
export const registrationEmailVerifyRateLimits =
  createRegistrationEmailVerifyRateLimits();
