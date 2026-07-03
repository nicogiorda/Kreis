// @vitest-environment node

import type { Request } from "express";
import { MemoryStore } from "express-rate-limit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storeMock = vi.hoisted(() => vi.fn(() => new MemoryStore()));

vi.mock("../../../core/rate-limit-store", () => ({
  createRateLimitStore: storeMock,
  certificateRateLimitPrefix: "rl:certificate:",
  registrationEmailStartIpRateLimitPrefix:
    "rl:email-verification:start:ip:",
  registrationEmailStartEmailRateLimitPrefix:
    "rl:email-verification:start:email:",
  registrationEmailVerifyIpRateLimitPrefix:
    "rl:email-verification:verify:ip:",
  registrationEmailVerifyEmailRateLimitPrefix:
    "rl:email-verification:verify:email:"
}));

function createRequest(email: string): Request {
  return {
    body: { email },
    headers: { "x-forwarded-for": "181.1.2.3, 162.158.1.1" },
    ip: "162.158.1.1",
    socket: { remoteAddress: "10.0.0.1" }
  } as unknown as Request;
}

describe("registration email verification rate limits", () => {
  beforeEach(() => {
    storeMock.mockClear();
  });

  it("uses the required Redis prefixes and limits", async () => {
    const module = await import("./email-verification-rate-limit");

    module.createRegistrationEmailStartRateLimits();
    module.createRegistrationEmailVerifyRateLimits();

    expect(storeMock).toHaveBeenCalledWith(
      "rl:email-verification:start:ip:"
    );
    expect(storeMock).toHaveBeenCalledWith(
      "rl:email-verification:start:email:"
    );
    expect(storeMock).toHaveBeenCalledWith(
      "rl:email-verification:verify:ip:"
    );
    expect(storeMock).toHaveBeenCalledWith(
      "rl:email-verification:verify:email:"
    );
    expect(module.registrationEmailStartIpLimit).toBe(10);
    expect(module.registrationEmailStartEmailLimit).toBe(3);
    expect(module.registrationEmailVerifyIpLimit).toBe(30);
    expect(module.registrationEmailVerifyEmailLimit).toBe(10);
  });

  it("hashes normalized emails before using them as keys", async () => {
    const module = await import("./email-verification-rate-limit");
    const literalEmail = "Student@UADE.edu.ar";
    const firstKey = module.getHashedRegistrationEmailKey(
      createRequest(` ${literalEmail} `)
    );
    const secondKey = module.getHashedRegistrationEmailKey(
      createRequest("student@uade.edu.ar")
    );

    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(/^[a-f0-9]{64}$/);
    expect(firstKey).not.toContain(literalEmail);
    expect(firstKey).not.toContain("student@uade.edu.ar");
  });
});
