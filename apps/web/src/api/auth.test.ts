import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyCertificate,
  register,
  startRegistrationEmailVerification,
  verifyRegistrationEmail
} from "./auth";

describe("registration auth API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts and verifies early email verification", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          status: "email_verification_sent",
          email: "student@uade.edu.ar",
          expires_at: "2026-07-03T15:10:00.000Z"
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "email_verified",
          email: "student@uade.edu.ar",
          verification: {
            token: "T".repeat(43),
            expires_at: "2026-07-03T15:30:00.000Z"
          }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await startRegistrationEmailVerification(
      "student@uade.edu.ar",
      123456
    );
    await verifyRegistrationEmail("student@uade.edu.ar", "123456");

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/v1/auth/email-verification/start"
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        email: "student@uade.edu.ar",
        legajo: 123456
      })
    });
    expect(fetchMock.mock.calls[1][0]).toContain(
      "/api/v1/auth/email-verification/verify"
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        email: "student@uade.edu.ar",
        code: "123456"
      })
    });
  });

  it("sends the email token to certificate classification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ certificate: { valid: true } })
    );
    vi.stubGlobal("fetch", fetchMock);
    const certificate = new File(["pdf"], "certificate.pdf", {
      type: "application/pdf"
    });

    await classifyCertificate(certificate, {
      email: "student@uade.edu.ar",
      legajo: 123456,
      nombre: "Ana",
      apellido: "Perez",
      email_verification_token: "email-token"
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("email_verification_token")).toBe("email-token");
  });

  it("sends both verification tokens to final registration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        status: "account_created",
        email: "student@uade.edu.ar"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await register({
      email: "student@uade.edu.ar",
      password: "secure-password",
      legajo: 123456,
      nombre: "Ana",
      apellido: "Perez",
      topicos: [1],
      email_verification_token: "email-token",
      certificate_verification_token: "certificate-token"
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      email_verification_token: "email-token",
      certificate_verification_token: "certificate-token"
    });
  });
});
