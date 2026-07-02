// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  CertificateVerificationError,
  ProfileCreationError,
  RegistrationEmailDomainError,
  RegistrationFinalizationError
} from "../domain/auth-errors";
import type {
  CertificateVerificationClaimResult,
  CertificateVerificationCleanupInput,
  ClaimCertificateVerificationInput,
  CreateCertificateVerificationInput,
  ICertificateVerificationRepository
} from "../domain/certificate-verification";
import { normalizeCertificateVerificationIdentity } from "../domain/certificate-verification";
import type {
  AuthSession,
  IAuthProvider,
  IUserRepository,
  RegisterInput,
  RegisterProfileInput
} from "../domain/auth.types";
import {
  createCertificateVerificationToken,
  hashCertificateVerificationToken
} from "../infrastructure/certificate-verification-token";
import { IssueCertificateVerificationUseCase } from "./issue-certificate-verification";
import { RegisterUseCase } from "./register";

type VerificationRecord = CreateCertificateVerificationInput & {
  claimedAt: Date | null;
  consumedAt: Date | null;
};

class InMemoryVerificationRepository implements ICertificateVerificationRepository {
  readonly records = new Map<string, VerificationRecord>();
  consumeSucceeds = true;

  async create(input: CreateCertificateVerificationInput): Promise<void> {
    this.records.set(input.tokenHash, {
      ...input,
      claimedAt: null,
      consumedAt: null
    });
  }

  async claim(
    input: ClaimCertificateVerificationInput
  ): Promise<CertificateVerificationClaimResult> {
    const record = this.records.get(input.tokenHash);

    if (!record) return { status: "invalid" };
    if (record.consumedAt || record.claimedAt) return { status: "used" };
    if (record.expiresAt <= input.claimedAt) return { status: "expired" };

    if (
      record.email !== input.email ||
      record.legajo !== input.legajo ||
      record.nombreNormalizado !== input.nombreNormalizado ||
      record.apellidoNormalizado !== input.apellidoNormalizado
    ) {
      return { status: "mismatch" };
    }

    record.claimedAt = input.claimedAt;
    return { status: "claimed", claimedAt: input.claimedAt };
  }

  async consume(tokenHash: string, claimedAt: Date, consumedAt: Date): Promise<boolean> {
    const record = this.records.get(tokenHash);
    if (!this.consumeSucceeds || !record || record.claimedAt?.getTime() !== claimedAt.getTime()) {
      return false;
    }

    record.consumedAt = consumedAt;
    return true;
  }

  async release(tokenHash: string, claimedAt: Date): Promise<void> {
    const record = this.records.get(tokenHash);
    if (record?.claimedAt?.getTime() === claimedAt.getTime() && !record.consumedAt) {
      record.claimedAt = null;
    }
  }

  async deleteStale(_input: CertificateVerificationCleanupInput): Promise<void> {}
}

class FakeAuthProvider implements IAuthProvider {
  readonly users = new Set<string>();
  readonly deletedUsers: string[] = [];
  failCreate = false;
  private nextId = 1;

  async createUser(email: string): Promise<{ id: string; email: string }> {
    if (this.failCreate) throw new Error("Supabase failed");

    const id = `auth-${this.nextId++}`;
    this.users.add(id);
    return { id, email };
  }

  async signIn(): Promise<AuthSession> {
    throw new Error("Not used");
  }

  async refreshSession(): Promise<AuthSession> {
    throw new Error("Not used");
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
    this.deletedUsers.push(id);
  }
}

class FakeUserRepository implements IUserRepository {
  readonly profiles = new Set<string>();
  readonly deletedProfiles: string[] = [];
  failCreate = false;

  async createProfile(authId: string, _input: RegisterProfileInput): Promise<void> {
    if (this.failCreate) throw new ProfileCreationError("Database failed");
    this.profiles.add(authId);
  }

  async deleteProfile(authId: string): Promise<void> {
    this.profiles.delete(authId);
    this.deletedProfiles.push(authId);
  }
}

const now = new Date("2026-07-02T15:00:00.000Z");

function createRegisterInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
  return {
    email: "student@uade.edu.ar",
    password: "secure-password",
    legajo: 123456,
    nombre: "María José",
    apellido: "Pérez",
    id_facultad: 5,
    topicos: [1, 2, 3],
    certificate_verification_token: "",
    ...overrides
  };
}

async function seedVerification(
  repository: InMemoryVerificationRepository,
  input: RegisterInput = createRegisterInput(),
  expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
): Promise<{ rawToken: string; tokenHash: string }> {
  const token = createCertificateVerificationToken();
  await repository.create({
    ...normalizeCertificateVerificationIdentity(input),
    tokenHash: token.tokenHash,
    expiresAt
  });
  return token;
}

function createHarness() {
  const verificationRepository = new InMemoryVerificationRepository();
  const authProvider = new FakeAuthProvider();
  const userRepository = new FakeUserRepository();
  const useCase = new RegisterUseCase(
    authProvider,
    userRepository,
    verificationRepository,
    { clock: () => new Date(now) }
  );

  return { verificationRepository, authProvider, userRepository, useCase };
}

async function expectVerificationCode(
  promise: Promise<unknown>,
  code: CertificateVerificationError["code"]
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("IssueCertificateVerificationUseCase", () => {
  it("returns a token for a valid certificate", async () => {
    const repository = new InMemoryVerificationRepository();
    const useCase = new IssueCertificateVerificationUseCase(repository, 15, {
      clock: () => new Date(now)
    });

    const result = await useCase.execute(true, createRegisterInput());

    expect(result?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result?.expires_at).toBe("2026-07-02T15:15:00.000Z");
  });

  it("does not issue a token for an invalid certificate", async () => {
    const repository = new InMemoryVerificationRepository();
    const useCase = new IssueCertificateVerificationUseCase(repository, 15, {
      clock: () => new Date(now)
    });

    await expect(useCase.execute(false, createRegisterInput())).resolves.toBeNull();
    expect(repository.records.size).toBe(0);
  });

  it("stores only the token hash", async () => {
    const repository = new InMemoryVerificationRepository();
    const useCase = new IssueCertificateVerificationUseCase(repository, 15, {
      clock: () => new Date(now)
    });

    const result = await useCase.execute(true, createRegisterInput());
    const storedHash = [...repository.records.keys()][0];

    expect(storedHash).toBe(hashCertificateVerificationToken(result!.token));
    expect(storedHash).not.toBe(result!.token);
  });

  it("does not issue a token for a disallowed email domain", async () => {
    const repository = new InMemoryVerificationRepository();
    const useCase = new IssueCertificateVerificationUseCase(repository, 15, {
      clock: () => new Date(now)
    });

    await expect(useCase.execute(true, createRegisterInput({
      email: "student@gmail.com"
    }))).rejects.toBeInstanceOf(RegistrationEmailDomainError);
    expect(repository.records.size).toBe(0);
  });
});

describe("RegisterUseCase certificate verification", () => {
  it("rejects a disallowed email domain before claiming the token", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);

    await expect(harness.useCase.execute(createRegisterInput({
      email: "student@gmail.com",
      certificate_verification_token: token.rawToken
    }))).rejects.toBeInstanceOf(RegistrationEmailDomainError);
    expect(harness.verificationRepository.records.get(token.tokenHash)?.claimedAt).toBeNull();
  });

  it("rejects registration without a token", async () => {
    const { useCase } = createHarness();
    await expectVerificationCode(
      useCase.execute(createRegisterInput()),
      "certificate_verification_required"
    );
  });

  it("rejects an unknown token", async () => {
    const { useCase } = createHarness();
    const token = createCertificateVerificationToken();
    await expectVerificationCode(
      useCase.execute(createRegisterInput({ certificate_verification_token: token.rawToken })),
      "certificate_verification_invalid"
    );
  });

  it("rejects an expired token", async () => {
    const harness = createHarness();
    const token = await seedVerification(
      harness.verificationRepository,
      createRegisterInput(),
      new Date(now.getTime() - 1)
    );
    await expectVerificationCode(
      harness.useCase.execute(createRegisterInput({ certificate_verification_token: token.rawToken })),
      "certificate_verification_expired"
    );
  });

  it("rejects an already consumed token", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    harness.verificationRepository.records.get(token.tokenHash)!.consumedAt = new Date(now);

    await expectVerificationCode(
      harness.useCase.execute(createRegisterInput({ certificate_verification_token: token.rawToken })),
      "certificate_verification_used"
    );
  });

  it("rejects a different email", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    await expectVerificationCode(
      harness.useCase.execute(createRegisterInput({
        email: "other@uade.edu.ar",
        certificate_verification_token: token.rawToken
      })),
      "certificate_verification_mismatch"
    );
  });

  it("rejects a different student number", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    await expectVerificationCode(
      harness.useCase.execute(createRegisterInput({
        legajo: 654321,
        certificate_verification_token: token.rawToken
      })),
      "certificate_verification_mismatch"
    );
  });

  it.each([
    { nombre: "Otro" },
    { apellido: "Otro" }
  ])("rejects a different name identity: %o", async (identityOverride) => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    await expectVerificationCode(
      harness.useCase.execute(createRegisterInput({
        ...identityOverride,
        certificate_verification_token: token.rawToken
      })),
      "certificate_verification_mismatch"
    );
  });

  it("allows registration with a valid token and consumes it", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);

    const user = await harness.useCase.execute(createRegisterInput({
      certificate_verification_token: token.rawToken
    }));

    expect(user.email).toBe("student@uade.edu.ar");
    expect(harness.verificationRepository.records.get(token.tokenHash)?.consumedAt).toEqual(now);
  });

  it("rejects a second registration with the same token", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    const input = createRegisterInput({ certificate_verification_token: token.rawToken });

    await harness.useCase.execute(input);
    await expectVerificationCode(
      harness.useCase.execute(input),
      "certificate_verification_used"
    );
  });

  it("allows only one of two concurrent claims", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    const input = createRegisterInput({ certificate_verification_token: token.rawToken });

    const results = await Promise.allSettled([
      harness.useCase.execute(input),
      harness.useCase.execute(input)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("releases the claim when Supabase creation fails", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    harness.authProvider.failCreate = true;

    await expect(harness.useCase.execute(createRegisterInput({
      certificate_verification_token: token.rawToken
    }))).rejects.toThrow("Supabase failed");
    expect(harness.verificationRepository.records.get(token.tokenHash)?.claimedAt).toBeNull();
  });

  it("deletes the Supabase user and releases the claim when profile creation fails", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    harness.userRepository.failCreate = true;

    await expect(harness.useCase.execute(createRegisterInput({
      certificate_verification_token: token.rawToken
    }))).rejects.toBeInstanceOf(ProfileCreationError);
    expect(harness.authProvider.users.size).toBe(0);
    expect(harness.authProvider.deletedUsers).toEqual(["auth-1"]);
    expect(harness.verificationRepository.records.get(token.tokenHash)?.claimedAt).toBeNull();
  });

  it("removes the complete account and releases the claim when final consumption fails", async () => {
    const harness = createHarness();
    const token = await seedVerification(harness.verificationRepository);
    harness.verificationRepository.consumeSucceeds = false;

    await expect(harness.useCase.execute(createRegisterInput({
      certificate_verification_token: token.rawToken
    }))).rejects.toBeInstanceOf(RegistrationFinalizationError);
    expect(harness.authProvider.users.size).toBe(0);
    expect(harness.userRepository.profiles.size).toBe(0);
    expect(harness.userRepository.deletedProfiles).toEqual(["auth-1"]);
    expect(harness.verificationRepository.records.get(token.tokenHash)?.claimedAt).toBeNull();
  });
});
