import { MemoryStore } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { config } from "./config";
import { getRedisClient, type RedisClient } from "./redis";

type RateLimitStore = MemoryStore | RedisStore;

export const certificateRateLimitPrefix = "rl:certificate:";

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