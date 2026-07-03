// @vitest-environment node

import express from "express";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../core/rate-limit-store", async () => {
  const { MemoryStore } = await import("express-rate-limit");

  return {
    certificateRateLimitPrefix: "rl:certificate:",
    createRateLimitStore: vi.fn(() => new MemoryStore())
  };
});

type CertificateRateLimitModule = typeof import("./certificate-rate-limit");

let certificateRateLimitModule: CertificateRateLimitModule;

async function createTestServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.post(
    "/certificate/classify",
    certificateRateLimitModule.createCertificateRateLimit(),
    (_request, response) => {
      response.json({ ok: true });
    }
  );

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Invalid test server address");

  return {
    url: `http://127.0.0.1:${address.port}/certificate/classify`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    })
  };
}

function createRequest(
  forwardedFor: string | string[] | undefined,
  ip?: string,
  remoteAddress?: string
): Request {
  return {
    headers: {
      ...(forwardedFor === undefined
        ? {}
        : { "x-forwarded-for": forwardedFor })
    },
    ip,
    socket: { remoteAddress }
  } as Request;
}

describe("certificate rate limit", () => {
  beforeEach(async () => {
    vi.resetModules();
    certificateRateLimitModule = await import("./certificate-rate-limit");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the expected certificate limiter options", () => {
    expect(certificateRateLimitModule.certificateRateLimitWindowMs).toBe(15 * 60 * 1000);
    expect(certificateRateLimitModule.certificateRateLimitLimit).toBe(3);
    expect(certificateRateLimitModule.certificateRateLimitMessage).toEqual({
      error: {
        code: "certificate_rate_limited",
        message: "Demasiados intentos de validacion de certificado. Intenta nuevamente en unos minutos."
      }
    });
  });

  it("uses the first X-Forwarded-For address as the client key", () => {
    const request = createRequest(
      "181.1.2.3, 162.158.1.1, 10.0.0.1",
      "162.158.1.1"
    );

    expect(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(request)
    ).toBe(ipKeyGenerator("181.1.2.3"));
  });

  it("keeps one key when Cloudflare proxy addresses change", () => {
    const firstRequest = createRequest(
      "181.1.2.3, 162.158.1.1",
      "162.158.1.1"
    );
    const secondRequest = createRequest(
      "181.1.2.3, 172.71.146.121",
      "172.71.146.121"
    );

    expect(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(firstRequest)
    ).toBe(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(secondRequest)
    );
  });

  it("returns 429 on the fourth request from the same client IP", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = await createTestServer();

    try {
      const responses = [];
      for (let index = 0; index < 4; index += 1) {
        responses.push(await fetch(server.url, {
          method: "POST",
          headers: {
            "X-Forwarded-For": `181.1.2.3, 162.158.1.${index + 1}`
          }
        }));
      }

      expect(responses.slice(0, 3).map((response) => response.status)).toEqual([200, 200, 200]);
      expect(responses[3].status).toBe(429);
      await expect(responses[3].json()).resolves.toEqual(
        certificateRateLimitModule.certificateRateLimitMessage
      );
    } finally {
      await server.close();
    }
  }, 15_000);

  it("falls back to request.ip when X-Forwarded-For is absent", () => {
    const request = createRequest(undefined, "181.1.2.4", "10.0.0.1");

    expect(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(request)
    ).toBe(ipKeyGenerator("181.1.2.4"));
  });

  it("normalizes IPv6 addresses with ipKeyGenerator", () => {
    const ipv6 = "2001:db8:abcd:1234:5678:90ab:cdef:1234";
    const request = createRequest([`${ipv6}, 2606:4700::6810:1`]);

    expect(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(request)
    ).toBe(ipKeyGenerator(ipv6));
  });

  it("falls back to the socket address and rejects a missing address", () => {
    const socketRequest = createRequest(undefined, undefined, "181.1.2.5");
    const missingAddressRequest = createRequest(undefined);

    expect(
      certificateRateLimitModule.certificateRateLimitKeyGenerator(socketRequest)
    ).toBe(ipKeyGenerator("181.1.2.5"));
    expect(() =>
      certificateRateLimitModule.certificateRateLimitKeyGenerator(
        missingAddressRequest
      )
    ).toThrow(
      "Certificate rate limiter could not determine the client address"
    );
  });
});
