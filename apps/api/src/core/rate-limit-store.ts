import { MemoryStore } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { config } from "./config";
import { getRedisClient, isRedisReady } from "./redis";

type RateLimitStore = MemoryStore | RedisStore;

export const certificateRateLimitPrefix = "rl:certificate:";

let memoryStoreWarningLogged = false;

function logMemoryStoreFallback(prefix: string): void {
  if (memoryStoreWarningLogged) return;

  memoryStoreWarningLogged = true;
  console.warn(`[rate-limit] using MemoryStore for ${prefix}; Redis is not ready in this environment`);
}

export function createRedisRateLimitStore(prefix: string): RedisStore {
  const client = getRedisClient();

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
  if (isRedisReady()) {
    return createRedisRateLimitStore(prefix);
  }

  if (config.NODE_ENV === "production") {
    throw new Error("Redis rate limit store is required in production");
  }

  logMemoryStoreFallback(prefix);
  return new MemoryStore();
}