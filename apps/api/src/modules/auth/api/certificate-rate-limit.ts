import rateLimit from "express-rate-limit";
import { certificateRateLimitPrefix, createRateLimitStore } from "../../../core/rate-limit-store";

export const certificateRateLimitWindowMs = 15 * 60 * 1000;
export const certificateRateLimitLimit = 3;
export const certificateRateLimitMessage = {
  error: {
    code: "certificate_rate_limited",
    message: "Demasiados intentos de validacion de certificado. Intenta nuevamente en unos minutos."
  }
};

export function createCertificateRateLimit() {
  return rateLimit({
    windowMs: certificateRateLimitWindowMs,
    store: createRateLimitStore(certificateRateLimitPrefix),
    passOnStoreError: false,
    limit: certificateRateLimitLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: certificateRateLimitMessage
  });
}

export const certificateRateLimit = createCertificateRateLimit();