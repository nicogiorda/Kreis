// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  RegistrationEmailDomainError,
  RegistrationEmailVerificationError
} from "../domain/auth-errors";
import type {
  IRegistrationEmailVerificationRepository,
  RegistrationEmailClaimResult,
  RegistrationEmailTokenStatus,
  RegistrationEmailVerificationRecord
} from "../domain/registration-email-verification";
import {
  hashRegistrationEmailVerificationToken
} from "../infrastructure/registration-email-verification-token";
import {
  StartRegistrationEmailVerificationUseCase,
  VerifyRegistrationEmailUseCase,
  type RegistrationEmailVerificationMailer
} from "./registration-email-verification";

const now = new Date("2026-07-03T15:00:00.000Z");
const secret = "test-registration-secret-with-at-least-32-characters";
const rawToken = "T".repeat(43);

class InMemoryEmailVerificationRepository
implements IRegistrationEmailVerificationRepository {
  record: RegistrationEmailVerificationRecord | null = null;
  verificationTokenHash: string | null = null;

  async replacePending(input: {
    email: string;
    codeHash: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<string> {
    this.record = {
      id: "verification-1",
      email: input.email,
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      verifiedAt: null,
      claimedAt: null,
      consumedAt: null
    };
    this.verificationTokenHash = null;
    return this.record.id;
  }

  async invalidate(_id: string, invalidatedAt: Date): Promise<void> {
    if (this.record) this.record.consumedAt = invalidatedAt;
  }

  async findPending(
    email: string
  ): Promise<RegistrationEmailVerificationRecord | null> {
    return this.record?.email === email &&
      !this.record.verifiedAt &&
      !this.record.consumedAt
      ? this.record
      : null;
  }

  async incrementAttempts(): Promise<number> {
    if (!this.record) throw new Error("Missing verification");
    this.record.attempts += 1;
    return this.record.attempts;
  }

  async markVerified(input: {
    id: string;
    verificationTokenHash: string;
    verifiedAt: Date;
    expiresAt: Date;
    maxAttempts: number;
  }): Promise<boolean> {
    if (
      !this.record ||
      this.record.id !== input.id ||
      this.record.attempts >= input.maxAttempts
    ) {
      return false;
    }

    this.record.verifiedAt = input.verifiedAt;
    this.record.expiresAt = input.expiresAt;
    this.verificationTokenHash = input.verificationTokenHash;
    return true;
  }

  async inspectToken(): Promise<RegistrationEmailTokenStatus> {
    throw new Error("Not used");
  }

  async claim(): Promise<RegistrationEmailClaimResult> {
    throw new Error("Not used");
  }

  async consume(): Promise<boolean> {
    throw new Error("Not used");
  }

  async release(): Promise<void> {
    throw new Error("Not used");
  }
}

function createHarness() {
  const repository = new InMemoryEmailVerificationRepository();
  const mailer: RegistrationEmailVerificationMailer = {
    sendCode: vi.fn().mockResolvedValue(undefined)
  };
  const start = new StartRegistrationEmailVerificationUseCase(
    repository,
    mailer,
    {
      allowedEmailDomains: new Set(["uade.edu.ar"]),
      secret,
      clock: () => new Date(now),
      createCode: () => "123456"
    }
  );
  const verify = new VerifyRegistrationEmailUseCase(repository, {
    allowedEmailDomains: new Set(["uade.edu.ar"]),
    secret,
    clock: () => new Date(now),
    createToken: () => ({
      rawToken,
      tokenHash: hashRegistrationEmailVerificationToken(rawToken)
    })
  });

  return { repository, mailer, start, verify };
}

describe("registration email verification", () => {
  it("rejects disallowed domains before creating or sending a code", async () => {
    const harness = createHarness();

    await expect(
      harness.start.execute("student@gmail.com")
    ).rejects.toBeInstanceOf(RegistrationEmailDomainError);
    expect(harness.repository.record).toBeNull();
    expect(harness.mailer.sendCode).not.toHaveBeenCalled();
  });

  it("stores only an HMAC and never returns the OTP or its hash", async () => {
    const harness = createHarness();

    const result = await harness.start.execute(" Student@UADE.edu.ar ");

    expect(harness.repository.record?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(harness.repository.record?.codeHash).not.toBe("123456");
    expect(result).toEqual({
      email: "student@uade.edu.ar",
      expiresAt: new Date("2026-07-03T15:10:00.000Z")
    });
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain(
      harness.repository.record?.codeHash
    );
  });

  it("increments attempts for an incorrect code", async () => {
    const harness = createHarness();
    await harness.start.execute("student@uade.edu.ar");

    await expect(
      harness.verify.execute("student@uade.edu.ar", "000000")
    ).rejects.toMatchObject({
      code: "email_verification_invalid"
    });
    expect(harness.repository.record?.attempts).toBe(1);
  });

  it("blocks verification after the maximum number of attempts", async () => {
    const harness = createHarness();
    await harness.start.execute("student@uade.edu.ar");

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        harness.verify.execute("student@uade.edu.ar", "000000")
      ).rejects.toMatchObject({
        code: "email_verification_invalid"
      });
    }

    await expect(
      harness.verify.execute("student@uade.edu.ar", "000000")
    ).rejects.toMatchObject({
      code: "email_verification_attempts_exceeded"
    });
    await expect(
      harness.verify.execute("student@uade.edu.ar", "123456")
    ).rejects.toBeInstanceOf(RegistrationEmailVerificationError);
  });

  it("returns an opaque token and stores only its hash", async () => {
    const harness = createHarness();
    await harness.start.execute("student@uade.edu.ar");

    const result = await harness.verify.execute(
      "student@uade.edu.ar",
      "123456"
    );

    expect(result.token).toBe(rawToken);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(harness.repository.verificationTokenHash).toBe(
      hashRegistrationEmailVerificationToken(rawToken)
    );
    expect(harness.repository.verificationTokenHash).not.toBe(rawToken);
  });
});
