// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseEnvironment } from "./config";

function createBaseEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://user:password@example.com:5432/postgres",
    DIRECT_URL: "postgresql://user:password@example.com:5432/postgres",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    SUPABASE_ANON_KEY: "anon-key",
    ...overrides
  };
}

describe("parseEnvironment Redis config", () => {
  it("allows REDIS_URL to be omitted in test", () => {
    const config = parseEnvironment(createBaseEnv());

    expect(config.REDIS_URL).toBeUndefined();
  });

  it("allows REDIS_URL to be omitted in development", () => {
    const config = parseEnvironment(createBaseEnv({ NODE_ENV: "development" }));

    expect(config.REDIS_URL).toBeUndefined();
  });

  it("requires production security and email configuration", () => {
    expect(() => parseEnvironment(createBaseEnv({ NODE_ENV: "production" }))).toThrow(
      /REDIS_URL is required in production/
    );

    const productionBase = {
      NODE_ENV: "production",
      REDIS_URL: "rediss://default:password@host:6379",
      RATE_LIMIT_KEY_SECRET: "a-secure-rate-limit-secret-with-32-characters",
      RESEND_API_KEY: "re_test",
      REGISTRATION_EMAIL_FROM: "Kreis <registro@example.com>"
    };

    expect(parseEnvironment(createBaseEnv(productionBase))).toMatchObject(
      productionBase
    );
  });

  it("accepts redis and rediss URLs", () => {
    expect(parseEnvironment(createBaseEnv({ REDIS_URL: "redis://default:password@host:6379" })).REDIS_URL)
      .toBe("redis://default:password@host:6379");
    expect(parseEnvironment(createBaseEnv({ REDIS_URL: "rediss://default:password@host:6379" })).REDIS_URL)
      .toBe("rediss://default:password@host:6379");
  });

  it("rejects non-Redis URLs without exposing credentials", () => {
    const secret = "super-secret-password";

    try {
      parseEnvironment(createBaseEnv({
        REDIS_URL: `https://default:${secret}@host:6379`
      }));
      throw new Error("Expected config parsing to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).toContain("REDIS_URL");
      expect(message).not.toContain(secret);
      expect(message).not.toContain("default:");
    }
  });

  it("requires rate-limit secrets to contain at least 32 characters", () => {
    expect(() =>
      parseEnvironment(createBaseEnv({ RATE_LIMIT_KEY_SECRET: "too-short" }))
    ).toThrow(/RATE_LIMIT_KEY_SECRET/);
  });
});
