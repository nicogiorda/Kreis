// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

type MockRedisHandler = (...args: unknown[]) => void;

type MockRedisInstance = {
  status: string;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  handlers: Map<string, MockRedisHandler>;
};

function createMockRedisClass() {
  const instances: MockRedisInstance[] = [];

  class MockRedis implements MockRedisInstance {
    status = "wait";
    handlers = new Map<string, MockRedisHandler>();
    on = vi.fn((event: string, handler: MockRedisHandler) => {
      this.handlers.set(event, handler);
      return this;
    });
    connect = vi.fn(async () => {
      this.status = "ready";
      this.handlers.get("connect")?.();
      this.handlers.get("ready")?.();
    });
    ping = vi.fn(async () => "PONG");
    quit = vi.fn(async () => {
      this.status = "end";
      this.handlers.get("close")?.();
    });
    disconnect = vi.fn(() => {
      this.status = "end";
      this.handlers.get("close")?.();
    });

    constructor(_url: string, _options: unknown) {
      instances.push(this);
    }
  }

  return { MockRedis, instances };
}

async function importRedisModule(redisUrl?: string) {
  vi.resetModules();

  const redisMock = createMockRedisClass();

  vi.doMock("ioredis", () => ({
    default: redisMock.MockRedis
  }));
  vi.doMock("./config", () => ({
    config: {
      NODE_ENV: redisUrl ? "production" : "test",
      REDIS_URL: redisUrl
    }
  }));

  const redisModule = await import("./redis");

  return { redisModule, instances: redisMock.instances };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("ioredis");
  vi.doUnmock("./config");
});

describe("Redis client", () => {
  it("reports disabled and avoids creating a client when REDIS_URL is missing", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { redisModule, instances } = await importRedisModule();

    expect(redisModule.getRedisClient()).toBeNull();
    await expect(redisModule.connectRedis()).resolves.toBe("disabled");
    expect(redisModule.getRedisHealthStatus()).toBe("disabled");
    expect(instances).toHaveLength(0);
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("disabled"));
  });

  it("uses a singleton client instead of creating one per call", async () => {
    const { redisModule, instances } = await importRedisModule("redis://default:secret@host:6379");

    const firstClient = redisModule.getRedisClient();
    const secondClient = redisModule.getRedisClient();

    expect(firstClient).toBe(secondClient);
    expect(instances).toHaveLength(1);
  });

  it("connects with PING and reports ready", async () => {
    const { redisModule, instances } = await importRedisModule("redis://default:secret@host:6379");

    await expect(redisModule.connectRedis()).resolves.toBe("ready");

    expect(instances).toHaveLength(1);
    expect(instances[0].connect).toHaveBeenCalledTimes(1);
    expect(instances[0].ping).toHaveBeenCalledTimes(1);
    expect(redisModule.isRedisReady()).toBe(true);
    expect(redisModule.getRedisHealthStatus()).toBe("ready");
  });

  it("does not expose credentials when initial Redis ping fails", async () => {
    const secret = "super-secret-password";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { redisModule, instances } = await importRedisModule(`redis://default:${secret}@host:6379`);

    redisModule.getRedisClient();
    instances[0].ping.mockRejectedValueOnce(new Error(`failed to connect with ${secret}`));

    await expect(redisModule.connectRedis()).rejects.toThrow("Redis connection failed");

    const loggedText = JSON.stringify(errorSpy.mock.calls);
    expect(loggedText).not.toContain(secret);
    expect(loggedText).not.toContain("default:");
    expect(redisModule.getRedisHealthStatus()).toBe("unavailable");
  });
});