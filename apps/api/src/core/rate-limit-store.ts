import { MemoryStore } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { config } from "./config";
import { getRedisClient, type RedisClient } from "./redis";

type RateLimitStore = MemoryStore | RedisStore;

export const certificateRateLimitPrefix = "rl:certificate:";
export const registrationEmailStartIpRateLimitPrefix =
  "rl:email-verification:start:ip:";
export const registrationEmailStartEmailRateLimitPrefix =
  "rl:email-verification:start:email:";
export const registrationEmailVerifyIpRateLimitPrefix =
  "rl:email-verification:verify:ip:";
export const registrationEmailVerifyEmailRateLimitPrefix =
  "rl:email-verification:verify:email:";
export const postCreationRateLimitPrefix = "rl:posts:create:";
export const commentCreationRateLimitPrefix = "rl:comments:create:";
export const eventCreationRateLimitPrefix = "rl:events:create:";
export const communityCreationRateLimitPrefix = "rl:communities:create:";
export const reportCreationRateLimitPrefix = "rl:reports:create:";

let memoryStoreWarningLogged = false;

function logMemoryStoreFallback(prefix: string): void {
  if (memoryStoreWarningLogged) return;

  memoryStoreWarningLogged = true;
  console.warn(`[rate-limit] using MemoryStore for ${prefix}; Redis is not configured for this environment`);
}

export function createRedisRateLimitStore(prefix: string, redisClient?: RedisClient): RedisStore {
  const client = redisClient ?? getRedisClient();

  if (!client) {
    throw new Error("Redis rate limit store requires a Redis client");
  }

  return new RedisStore({
    prefix,
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const [command, ...commandArgs] = args;
      return client.call(command, ...commandArgs) as Promise<RedisReply>;
    }
  });
}

export function createRateLimitStore(prefix: string): RateLimitStore {
  const client = getRedisClient();

  if (client) {
    return createRedisRateLimitStore(prefix, client);
  }

  if (config.NODE_ENV === "production") {
    throw new Error("Redis rate limit store is required in production");
  }

  logMemoryStoreFallback(prefix);
  return new MemoryStore();
}
