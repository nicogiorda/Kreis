// @vitest-environment node

import express from "express";
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

  it("returns 429 on the fourth request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = await createTestServer();

    try {
      const responses = [];
      for (let index = 0; index < 4; index += 1) {
        responses.push(await fetch(server.url, { method: "POST" }));
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
});