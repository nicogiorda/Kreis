import {
  RegistrationEmailDomainError,
  RegistrationEmailVerificationError,
  RegistrationEmailVerificationMailerError
} from "../domain/auth-errors";
import type {
  IRegistrationEmailVerificationRepository,
  RegistrationEmailTokenStatus
} from "../domain/registration-email-verification";
import { isAllowedRegistrationEmail } from "../domain/registration-email";
import {
  createRegistrationEmailCode,
  createRegistrationEmailVerificationToken,
  hashRegistrationEmailCode,
  hashRegistrationEmailVerificationToken,
  isRegistrationEmailVerificationTokenValid,
  registrationEmailCodeMatches
} from "../infrastructure/registration-email-verification-token";

type Clock = () => Date;

export interface RegistrationEmailVerificationMailer {
  sendCode(input: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<void>;
}

type RegistrationEmailVerificationOptions = {
  allowedEmailDomains: ReadonlySet<string>;
  secret: string;
  codeTtlMinutes?: number;
  tokenTtlMinutes?: number;
  maxAttempts?: number;
  clock?: Clock;
  createCode?: () => string;
  createToken?: typeof createRegistrationEmailVerificationToken;
};

const statusMessages: Record<
  Exclude<RegistrationEmailTokenStatus, "valid"> | "attempts_exceeded",
  string
> = {
  invalid: "El codigo o la verificacion de correo no son validos.",
  expired: "La verificacion del correo vencio. Solicita un nuevo codigo.",
  used: "La verificacion del correo ya fue utilizada.",
  mismatch: "La verificacion no corresponde al correo ingresado.",
  attempts_exceeded: "Se alcanzo el maximo de intentos para este codigo."
};

function normalizeEmail(
  email: string,
  allowedEmailDomains: ReadonlySet<string>
): string {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAllowedRegistrationEmail(normalizedEmail, allowedEmailDomains)) {
    throw new RegistrationEmailDomainError();
  }

  return normalizedEmail;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function throwForTokenStatus(
  status: Exclude<RegistrationEmailTokenStatus, "valid">
): never {
  throw new RegistrationEmailVerificationError(
    `email_verification_${status}`,
    statusMessages[status]
  );
}

export class StartRegistrationEmailVerificationUseCase {
  private readonly codeTtlMinutes: number;
  private readonly clock: Clock;
  private readonly createCode: () => string;

  constructor(
    private readonly repository: IRegistrationEmailVerificationRepository,
    private readonly mailer: RegistrationEmailVerificationMailer,
    private readonly options: RegistrationEmailVerificationOptions
  ) {
    this.codeTtlMinutes = options.codeTtlMinutes ?? 10;
    this.clock = options.clock ?? (() => new Date());
    this.createCode = options.createCode ?? createRegistrationEmailCode;
  }

  async execute(email: string): Promise<{ email: string; expiresAt: Date }> {
    const normalizedEmail = normalizeEmail(
      email,
      this.options.allowedEmailDomains
    );
    const createdAt = this.clock();
    const expiresAt = addMinutes(createdAt, this.codeTtlMinutes);
    const code = this.createCode();
    const codeHash = hashRegistrationEmailCode(
      normalizedEmail,
      code,
      this.options.secret
    );
    const verificationId = await this.repository.replacePending({
      email: normalizedEmail,
      codeHash,
      createdAt,
      expiresAt
    });

    try {
      await this.mailer.sendCode({
        email: normalizedEmail,
        code,
        expiresAt
      });
    } catch {
      await this.repository.invalidate(verificationId, this.clock());
      throw new RegistrationEmailVerificationMailerError();
    }

    return { email: normalizedEmail, expiresAt };
  }
}

export class VerifyRegistrationEmailUseCase {
  private readonly maxAttempts: number;
  private readonly tokenTtlMinutes: number;
  private readonly clock: Clock;
  private readonly createToken: typeof createRegistrationEmailVerificationToken;

  constructor(
    private readonly repository: IRegistrationEmailVerificationRepository,
    private readonly options: RegistrationEmailVerificationOptions
  ) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.tokenTtlMinutes = options.tokenTtlMinutes ?? 30;
    this.clock = options.clock ?? (() => new Date());
    this.createToken =
      options.createToken ?? createRegistrationEmailVerificationToken;
  }

  async execute(email: string, code: string): Promise<{
    email: string;
    token: string;
    expiresAt: Date;
  }> {
    const normalizedEmail = normalizeEmail(
      email,
      this.options.allowedEmailDomains
    );
    const verification = await this.repository.findPending(normalizedEmail);
    const verifiedAt = this.clock();

    if (!verification) {
      throw new RegistrationEmailVerificationError(
        "email_verification_invalid",
        statusMessages.invalid
      );
    }

    if (verification.expiresAt <= verifiedAt) {
      throw new RegistrationEmailVerificationError(
        "email_verification_expired",
        statusMessages.expired
      );
    }

    if (verification.attempts >= this.maxAttempts) {
      throw new RegistrationEmailVerificationError(
        "email_verification_attempts_exceeded",
        statusMessages.attempts_exceeded
      );
    }

    const candidateHash = hashRegistrationEmailCode(
      normalizedEmail,
      code,
      this.options.secret
    );

    if (!registrationEmailCodeMatches(verification.codeHash, candidateHash)) {
      const attempts = await this.repository.incrementAttempts(verification.id);
      const code =
        attempts >= this.maxAttempts
          ? "email_verification_attempts_exceeded"
          : "email_verification_invalid";

      throw new RegistrationEmailVerificationError(
        code,
        attempts >= this.maxAttempts
          ? statusMessages.attempts_exceeded
          : statusMessages.invalid
      );
    }

    const token = this.createToken();
    const expiresAt = addMinutes(verifiedAt, this.tokenTtlMinutes);
    const marked = await this.repository.markVerified({
      id: verification.id,
      verificationTokenHash: token.tokenHash,
      verifiedAt,
      expiresAt,
      maxAttempts: this.maxAttempts
    });

    if (!marked) {
      throw new RegistrationEmailVerificationError(
        "email_verification_invalid",
        statusMessages.invalid
      );
    }

    return {
      email: normalizedEmail,
      token: token.rawToken,
      expiresAt
    };
  }
}

export class ValidateRegistrationEmailVerificationUseCase {
  private readonly clock: Clock;

  constructor(
    private readonly repository: IRegistrationEmailVerificationRepository,
    private readonly options: Pick<
      RegistrationEmailVerificationOptions,
      "allowedEmailDomains" | "clock"
    >
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  async execute(email: string, rawToken: string): Promise<void> {
    const normalizedEmail = normalizeEmail(
      email,
      this.options.allowedEmailDomains
    );

    if (!isRegistrationEmailVerificationTokenValid(rawToken)) {
      throw new RegistrationEmailVerificationError(
        "email_verification_invalid",
        statusMessages.invalid
      );
    }

    const status = await this.repository.inspectToken({
      email: normalizedEmail,
      verificationTokenHash:
        hashRegistrationEmailVerificationToken(rawToken),
      checkedAt: this.clock()
    });

    if (status !== "valid") throwForTokenStatus(status);
  }
}
