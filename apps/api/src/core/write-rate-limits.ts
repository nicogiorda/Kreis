import { createHash } from "node:crypto";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  commentCreationRateLimitPrefix,
  communityCreationRateLimitPrefix,
  createRateLimitStore,
  eventCreationRateLimitPrefix,
  postCreationRateLimitPrefix,
  reportCreationRateLimitPrefix
} from "./rate-limit-store";

export const writeRateLimitWindowMs = 10 * 60 * 1000;

export const postCreationRateLimitLimit = 10;
export const commentCreationRateLimitLimit = 30;
export const eventCreationRateLimitLimit = 5;
export const communityCreationRateLimitLimit = 3;
export const reportCreationRateLimitLimit = 15;

export const writeRateLimitMessage = {
  error: {
    code: "write_rate_limited",
    message: "Demasiadas acciones en poco tiempo. Intenta nuevamente en unos minutos."
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

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function hashRateLimitToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function getWriteRateLimitClientIp(request: Request): string {
  const forwardedAddress = getFirstForwardedAddress(
    request.headers["x-forwarded-for"]
  );
  const clientAddress =
    forwardedAddress ||
    request.ip?.trim() ||
    request.socket.remoteAddress?.trim();

  if (!clientAddress) {
    throw new Error("Write rate limiter could not determine the client address");
  }

  return clientAddress;
}

export function writeRateLimitKeyGenerator(request: Request): string {
  const bearerToken = getBearerToken(request.headers.authorization);

  if (bearerToken) {
    return `token:${hashRateLimitToken(bearerToken)}`;
  }

  return `ip:${ipKeyGenerator(getWriteRateLimitClientIp(request))}`;
}

function createWriteRateLimit(prefix: string, limit: number) {
  return rateLimit({
    windowMs: writeRateLimitWindowMs,
    store: createRateLimitStore(prefix),
    passOnStoreError: false,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: writeRateLimitKeyGenerator,
    message: writeRateLimitMessage
  });
}

export function createPostCreationRateLimit() {
  return createWriteRateLimit(postCreationRateLimitPrefix, postCreationRateLimitLimit);
}

export function createCommentCreationRateLimit() {
  return createWriteRateLimit(commentCreationRateLimitPrefix, commentCreationRateLimitLimit);
}

export function createEventCreationRateLimit() {
  return createWriteRateLimit(eventCreationRateLimitPrefix, eventCreationRateLimitLimit);
}

export function createCommunityCreationRateLimit() {
  return createWriteRateLimit(communityCreationRateLimitPrefix, communityCreationRateLimitLimit);
}

export function createReportCreationRateLimit() {
  return createWriteRateLimit(reportCreationRateLimitPrefix, reportCreationRateLimitLimit);
}

export const postCreationRateLimit = createPostCreationRateLimit();
export const commentCreationRateLimit = createCommentCreationRateLimit();
export const eventCreationRateLimit = createEventCreationRateLimit();
export const communityCreationRateLimit = createCommunityCreationRateLimit();
export const reportCreationRateLimit = createReportCreationRateLimit();
