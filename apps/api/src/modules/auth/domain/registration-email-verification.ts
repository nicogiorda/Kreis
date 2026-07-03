export type RegistrationEmailVerificationRecord = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  verifiedAt: Date | null;
  claimedAt: Date | null;
  consumedAt: Date | null;
};

export type RegistrationEmailTokenStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "used"
  | "mismatch";

export type RegistrationEmailClaimResult =
  | { status: "claimed"; claimedAt: Date }
  | { status: Exclude<RegistrationEmailTokenStatus, "valid"> };

export interface IRegistrationEmailVerificationRepository {
  replacePending(input: {
    email: string;
    codeHash: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<string>;
  invalidate(id: string, invalidatedAt: Date): Promise<void>;
  findPending(email: string): Promise<RegistrationEmailVerificationRecord | null>;
  incrementAttempts(id: string): Promise<number>;
  markVerified(input: {
    id: string;
    verificationTokenHash: string;
    verifiedAt: Date;
    expiresAt: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  inspectToken(input: {
    email: string;
    verificationTokenHash: string;
    checkedAt: Date;
  }): Promise<RegistrationEmailTokenStatus>;
  claim(input: {
    email: string;
    verificationTokenHash: string;
    claimedAt: Date;
  }): Promise<RegistrationEmailClaimResult>;
  consume(
    verificationTokenHash: string,
    claimedAt: Date,
    consumedAt: Date
  ): Promise<boolean>;
  release(verificationTokenHash: string, claimedAt: Date): Promise<void>;
}
