import Redis from "ioredis";
import { config } from "./config";

export type RedisHealthStatus = "ready" | "disabled" | "unavailable";

type RedisClient = Redis;

let redisClient: RedisClient | null = null;
let redisReady = false;
let redisDisabledLogged = false;

function hasRedisUrl(): boolean {
  return Boolean(config.REDIS_URL);
}

function logRedisDisabled(): void {
  if (redisDisabledLogged) return;

  redisDisabledLogged = true;
  console.info("[redis] disabled: REDIS_URL is not configured for this environment");
}

function createRedisClient(): RedisClient | null {
  if (!hasRedisUrl()) {
    logRedisDisabled();
    return null;
  }

  if (redisClient) return redisClient;

  redisClient = new Redis(config.REDIS_URL!, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 100, 2_000);
    }
  });

  redisClient.on("error", () => {
    redisReady = false;
    console.error("[redis] connection error");
  });

  redisClient.on("connect", () => {
    console.info("[redis] connected");
  });

  redisClient.on("ready", () => {
    redisReady = true;
    console.info("[redis] ready");
  });

  redisClient.on("close", () => {
    redisReady = false;
    console.warn("[redis] connection closed");
  });

  redisClient.on("reconnecting", () => {
    redisReady = false;
    console.info("[redis] reconnecting");
  });

  return redisClient;
}

export function getRedisClient(): RedisClient | null {
  return createRedisClient();
}

export function isRedisReady(): boolean {
  return Boolean(redisClient && redisReady && redisClient.status === "ready");
}

export function getRedisHealthStatus(): RedisHealthStatus {
  if (!hasRedisUrl()) return "disabled";

  return isRedisReady() ? "ready" : "unavailable";
}

export async function connectRedis(): Promise<RedisHealthStatus> {
  const client = createRedisClient();

  if (!client) return "disabled";

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    const pingResponse = await client.ping();

    if (pingResponse !== "PONG") {
      throw new Error("Unexpected Redis PING response");
    }

    redisReady = true;
    return "ready";
  } catch {
    redisReady = false;
    console.error("[redis] initial connection or ping failed");
    throw new Error("Redis connection failed");
  }
}

export async function disconnectRedis(): Promise<void> {
  const client = redisClient;

  if (!client) return;

  redisReady = false;
  redisClient = null;

  try {
    if (client.status === "ready" || client.status === "connect") {
      await client.quit();
      return;
    }

    client.disconnect();
  } catch {
    client.disconnect();
  }
}