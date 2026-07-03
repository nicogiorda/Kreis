import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { certificateRateLimitPrefix, createRateLimitStore } from "../../../core/rate-limit-store";

export const certificateRateLimitWindowMs = 15 * 60 * 1000;
export const certificateRateLimitLimit = 3;
export const certificateRateLimitMessage = {
  error: {
    code: "certificate_rate_limited",
    message: "Demasiados intentos de validacion de certificado. Intenta nuevamente en unos minutos."
  }
};

function getFirstForwardedAddress(
  forwardedFor: string | string[] | undefined
): string | null {
  const firstHeaderValue = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor;
  const firstAddress = firstHeaderValue?.split(",")[0]?.trim();

  return firstAddress || null;
}

export function getCertificateRateLimitClientIp(request: Request): string {
  const forwardedAddress = getFirstForwardedAddress(
    request.headers["x-forwarded-for"]
  );
  const clientAddress =
    forwardedAddress ||
    request.ip?.trim() ||
    request.socket.remoteAddress?.trim();

  if (!clientAddress) {
    throw new Error(
      "Certificate rate limiter could not determine the client address"
    );
  }

  return clientAddress;
}

export function certificateRateLimitKeyGenerator(request: Request): string {
  return ipKeyGenerator(getCertificateRateLimitClientIp(request));
}

export function createCertificateRateLimit() {
  return rateLimit({
    windowMs: certificateRateLimitWindowMs,
    store: createRateLimitStore(certificateRateLimitPrefix),
    passOnStoreError: false,
    limit: certificateRateLimitLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: certificateRateLimitKeyGenerator,
    message: certificateRateLimitMessage
  });
}

export const certificateRateLimit = createCertificateRateLimit();
