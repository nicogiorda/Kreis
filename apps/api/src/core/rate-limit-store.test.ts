// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

type RedisStoreConstructor = ReturnType<typeof vi.fn>;

async function importRateLimitStore({
  nodeEnv = "test",
  redisReady = false,
  redisClient = null
}: {
  nodeEnv?: "development" | "test" | "production";
  redisReady?: boolean;
  redisClient?: { call: ReturnType<typeof vi.fn> } | null;
} = {}) {
  vi.resetModules();

  const RedisStoreMock = vi.fn(function RedisStore(this: { prefix?: string }, options: { prefix: string }) {
    this.prefix = options.prefix;
  }) as RedisStoreConstructor;
  const getRedisClient = vi.fn(() => redisClient);

  vi.doMock("rate-limit-redis", () => ({
    RedisStore: RedisStoreMock
  }));
  vi.doMock("./config", () => ({
    config: { NODE_ENV: nodeEnv }
  }));
  vi.doMock("./redis", () => ({
    getRedisClient,
    isRedisReady: vi.fn(() => redisReady)
  }));

  const module = await import("./rate-limit-store");

  return { module, RedisStoreMock, getRedisClient };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("rate-limit-redis");
  vi.doUnmock("./config");
  vi.doUnmock("./redis");
});

describe("rate limit store", () => {
  it("creates RedisStore in production when a Redis client exists", async () => {
    const redisClient = { call: vi.fn() };
    const { module, RedisStoreMock, getRedisClient } = await importRateLimitStore({
      nodeEnv: "production",
      redisReady: true,
      redisClient
    });

    const store = module.createRateLimitStore(module.certificateRateLimitPrefix);

    expect(RedisStoreMock).toHaveBeenCalledTimes(1);
    expect(RedisStoreMock).toHaveBeenCalledWith(expect.objectContaining({
      prefix: "rl:certificate:"
    }));
    expect(getRedisClient).toHaveBeenCalledTimes(1);
    expect(store).toMatchObject({ prefix: "rl:certificate:" });
  });

  it("uses MemoryStore in development when Redis is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { module, RedisStoreMock } = await importRateLimitStore({
      nodeEnv: "development",
      redisReady: false
    });

    const store = module.createRateLimitStore(module.certificateRateLimitPrefix);

    expect(RedisStoreMock).not.toHaveBeenCalled();
    expect(store.constructor.name).toBe("MemoryStore");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("redis://");
  });

  it("uses MemoryStore in test when Redis is not configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { module, RedisStoreMock } = await importRateLimitStore({
      nodeEnv: "test",
      redisReady: false
    });

    const store = module.createRateLimitStore(module.certificateRateLimitPrefix);

    expect(RedisStoreMock).not.toHaveBeenCalled();
    expect(store.constructor.name).toBe("MemoryStore");
  });

  it("throws safely in production when Redis is not configured", async () => {
    const secret = "super-secret-password";
    const { module } = await importRateLimitStore({
      nodeEnv: "production",
      redisReady: false,
      redisClient: null
    });

    expect(() => module.createRateLimitStore(module.certificateRateLimitPrefix)).toThrow(
      "Redis rate limit store is required in production"
    );

    try {
      module.createRateLimitStore(module.certificateRateLimitPrefix);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(secret);
      expect(message).not.toContain("redis://");
    }
  });
});
