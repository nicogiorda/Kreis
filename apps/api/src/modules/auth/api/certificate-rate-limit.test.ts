// @vitest-environment node

import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  certificateRateLimitLimit,
  certificateRateLimitMessage,
  certificateRateLimitWindowMs,
  createCertificateRateLimit
} from "./certificate-rate-limit";

async function createTestServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.post("/certificate/classify", createCertificateRateLimit(), (_request, response) => {
    response.json({ ok: true });
  });

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the expected certificate limiter options", () => {
    expect(certificateRateLimitWindowMs).toBe(15 * 60 * 1000);
    expect(certificateRateLimitLimit).toBe(3);
    expect(certificateRateLimitMessage).toEqual({
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
      await expect(responses[3].json()).resolves.toEqual(certificateRateLimitMessage);
    } finally {
      await server.close();
    }
  }, 15_000);
});