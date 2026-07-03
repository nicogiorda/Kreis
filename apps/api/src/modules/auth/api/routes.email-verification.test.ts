// @vitest-environment node

import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const processCertificatePdfMock = vi.hoisted(() => vi.fn());
const inspectTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("invalid"));

vi.mock("./certificate-rate-limit", () => ({
  certificateRateLimit: (
    _request: express.Request,
    _response: express.Response,
    next: express.NextFunction
  ) => next()
}));

vi.mock("./email-verification-rate-limit", () => ({
  registrationEmailStartRateLimits: [],
  registrationEmailVerifyRateLimits: []
}));

vi.mock("../infrastructure/document-ai-certificate-classifier", () => ({
  CertificateClassifierConfigError: class extends Error {},
  CertificateClassifierRequestError: class extends Error {},
  processCertificatePdf: processCertificatePdfMock
}));

vi.mock(
  "../infrastructure/prisma-registration-email-verification-repository",
  () => ({
    PrismaRegistrationEmailVerificationRepository: class {
      inspectToken = inspectTokenMock;
      claim = vi.fn();
      release = vi.fn();
    }
  })
);

type TestServer = {
  url: string;
  close: () => Promise<void>;
};

let server: TestServer;

beforeAll(async () => {
  const { createAuthRouter } = await import("./routes");
  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter());

  const httpServer = app.listen(0);
  await new Promise<void>((resolve) =>
    httpServer.once("listening", resolve)
  );
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Invalid test server address");
  }

  server = {
    url: `http://127.0.0.1:${address.port}/api/v1/auth`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      })
  };
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  inspectTokenMock.mockResolvedValue("invalid");
});

function createCertificateForm(emailVerificationToken?: string): FormData {
  const form = new FormData();
  form.append(
    "certificate",
    new Blob(["certificate"], { type: "application/pdf" }),
    "certificate.pdf"
  );
  form.append("email", "student@uade.edu.ar");
  form.append("legajo", "123456");
  form.append("nombre", "Ana");
  form.append("apellido", "Perez");
  if (emailVerificationToken) {
    form.append("email_verification_token", emailVerificationToken);
  }
  return form;
}

describe("auth routes email verification gate", () => {
  it("rejects certificate classification without an email token", async () => {
    const response = await fetch(`${server.url}/certificate/classify`, {
      method: "POST",
      body: createCertificateForm()
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "email_verification_required" }
    });
    expect(processCertificatePdfMock).not.toHaveBeenCalled();
  });

  it("does not call Document AI for an invalid email token", async () => {
    const response = await fetch(`${server.url}/certificate/classify`, {
      method: "POST",
      body: createCertificateForm("T".repeat(43))
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "email_verification_invalid" }
    });
    expect(inspectTokenMock).toHaveBeenCalledTimes(1);
    expect(processCertificatePdfMock).not.toHaveBeenCalled();
  });

  it("rejects final registration without an email token", async () => {
    const response = await fetch(`${server.url}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@uade.edu.ar",
        password: "secure-password",
        legajo: 123456,
        nombre: "Ana",
        apellido: "Perez",
        topicos: [],
        certificate_verification_token: "C".repeat(43)
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "email_verification_required" }
    });
  });
});
