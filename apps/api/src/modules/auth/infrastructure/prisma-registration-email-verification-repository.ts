import { prisma } from "../../../core/database";
import type {
  IRegistrationEmailVerificationRepository,
  RegistrationEmailClaimResult,
  RegistrationEmailTokenStatus,
  RegistrationEmailVerificationRecord
} from "../domain/registration-email-verification";

function mapRecord(record: {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  verified_at: Date | null;
  claimed_at: Date | null;
  consumed_at: Date | null;
}): RegistrationEmailVerificationRecord {
  return {
    id: record.id,
    email: record.email,
    codeHash: record.code_hash,
    attempts: record.attempts,
    expiresAt: record.expires_at,
    verifiedAt: record.verified_at,
    claimedAt: record.claimed_at,
    consumedAt: record.consumed_at
  };
}

export class PrismaRegistrationEmailVerificationRepository
implements IRegistrationEmailVerificationRepository {
  async replacePending(input: {
    email: string;
    codeHash: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<string> {
    return prisma.$transaction(async (transaction) => {
      await transaction.registration_email_verification.updateMany({
        where: {
          email: input.email,
          consumed_at: null
        },
        data: {
          consumed_at: input.createdAt
        }
      });

      const verification =
        await transaction.registration_email_verification.create({
          data: {
            email: input.email,
            code_hash: input.codeHash,
            created_at: input.createdAt,
            expires_at: input.expiresAt
          },
          select: { id: true }
        });

      return verification.id;
    });
  }

  async invalidate(id: string, invalidatedAt: Date): Promise<void> {
    await prisma.registration_email_verification.updateMany({
      where: { id, consumed_at: null },
      data: { consumed_at: invalidatedAt }
    });
  }

  async findPending(
    email: string
  ): Promise<RegistrationEmailVerificationRecord | null> {
    const verification =
      await prisma.registration_email_verification.findFirst({
        where: {
          email,
          verified_at: null,
          consumed_at: null
        },
        orderBy: { created_at: "desc" }
      });

    return verification ? mapRecord(verification) : null;
  }

  async incrementAttempts(id: string): Promise<number> {
    const verification =
      await prisma.registration_email_verification.update({
        where: { id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true }
      });

    return verification.attempts;
  }

  async markVerified(input: {
    id: string;
    verificationTokenHash: string;
    verifiedAt: Date;
    expiresAt: Date;
    maxAttempts: number;
  }): Promise<boolean> {
    const result = await prisma.registration_email_verification.updateMany({
      where: {
        id: input.id,
        verified_at: null,
        consumed_at: null,
        attempts: { lt: input.maxAttempts },
        expires_at: { gt: input.verifiedAt }
      },
      data: {
        verification_token_hash: input.verificationTokenHash,
        verified_at: input.verifiedAt,
        expires_at: input.expiresAt
      }
    });

    return result.count === 1;
  }

  async inspectToken(input: {
    email: string;
    verificationTokenHash: string;
    checkedAt: Date;
  }): Promise<RegistrationEmailTokenStatus> {
    const verification =
      await prisma.registration_email_verification.findFirst({
        where: {
          verification_token_hash: input.verificationTokenHash
        },
        select: {
          email: true,
          expires_at: true,
          verified_at: true,
          claimed_at: true,
          consumed_at: true
        }
      });

    if (!verification || !verification.verified_at) return "invalid";
    if (verification.email !== input.email) return "mismatch";
    if (verification.consumed_at || verification.claimed_at) return "used";
    if (verification.expires_at <= input.checkedAt) return "expired";

    return "valid";
  }

  async claim(input: {
    email: string;
    verificationTokenHash: string;
    claimedAt: Date;
  }): Promise<RegistrationEmailClaimResult> {
    const result = await prisma.registration_email_verification.updateMany({
      where: {
        email: input.email,
        verification_token_hash: input.verificationTokenHash,
        verified_at: { not: null },
        claimed_at: null,
        consumed_at: null,
        expires_at: { gt: input.claimedAt }
      },
      data: { claimed_at: input.claimedAt }
    });

    if (result.count === 1) {
      return { status: "claimed", claimedAt: input.claimedAt };
    }

    const status = await this.inspectToken({
      email: input.email,
      verificationTokenHash: input.verificationTokenHash,
      checkedAt: input.claimedAt
    });

    return { status: status === "valid" ? "invalid" : status };
  }

  async consume(
    verificationTokenHash: string,
    claimedAt: Date,
    consumedAt: Date
  ): Promise<boolean> {
    const result = await prisma.registration_email_verification.updateMany({
      where: {
        verification_token_hash: verificationTokenHash,
        claimed_at: claimedAt,
        consumed_at: null
      },
      data: { consumed_at: consumedAt }
    });

    return result.count === 1;
  }

  async release(
    verificationTokenHash: string,
    claimedAt: Date
  ): Promise<void> {
    await prisma.registration_email_verification.updateMany({
      where: {
        verification_token_hash: verificationTokenHash,
        claimed_at: claimedAt,
        consumed_at: null
      },
      data: { claimed_at: null }
    });
  }
}
