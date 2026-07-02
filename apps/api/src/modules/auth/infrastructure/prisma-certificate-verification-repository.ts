import { prisma } from "../../../core/database";
import type {
  CertificateVerificationClaimResult,
  CertificateVerificationCleanupInput,
  ClaimCertificateVerificationInput,
  CreateCertificateVerificationInput,
  ICertificateVerificationRepository
} from "../domain/certificate-verification";

export class PrismaCertificateVerificationRepository
implements ICertificateVerificationRepository {
  async create(input: CreateCertificateVerificationInput): Promise<void> {
    await prisma.certificate_verification.create({
      data: {
        token_hash: input.tokenHash,
        email: input.email,
        legajo: input.legajo,
        nombre_normalizado: input.nombreNormalizado,
        apellido_normalizado: input.apellidoNormalizado,
        expires_at: input.expiresAt
      }
    });
  }

  async claim(
    input: ClaimCertificateVerificationInput
  ): Promise<CertificateVerificationClaimResult> {
    const result = await prisma.certificate_verification.updateMany({
      where: {
        token_hash: input.tokenHash,
        consumed_at: null,
        claimed_at: null,
        expires_at: { gt: input.claimedAt },
        email: input.email,
        legajo: input.legajo,
        nombre_normalizado: input.nombreNormalizado,
        apellido_normalizado: input.apellidoNormalizado
      },
      data: {
        claimed_at: input.claimedAt
      }
    });

    if (result.count === 1) {
      return { status: "claimed", claimedAt: input.claimedAt };
    }

    const verification = await prisma.certificate_verification.findUnique({
      where: { token_hash: input.tokenHash },
      select: {
        email: true,
        legajo: true,
        nombre_normalizado: true,
        apellido_normalizado: true,
        expires_at: true,
        claimed_at: true,
        consumed_at: true
      }
    });

    if (!verification) return { status: "invalid" };
    if (verification.consumed_at || verification.claimed_at) return { status: "used" };
    if (verification.expires_at <= input.claimedAt) return { status: "expired" };

    const matchesIdentity =
      verification.email === input.email &&
      verification.legajo === input.legajo &&
      verification.nombre_normalizado === input.nombreNormalizado &&
      verification.apellido_normalizado === input.apellidoNormalizado;

    return { status: matchesIdentity ? "invalid" : "mismatch" };
  }

  async consume(tokenHash: string, claimedAt: Date, consumedAt: Date): Promise<boolean> {
    const result = await prisma.certificate_verification.updateMany({
      where: {
        token_hash: tokenHash,
        claimed_at: claimedAt,
        consumed_at: null
      },
      data: {
        consumed_at: consumedAt
      }
    });

    return result.count === 1;
  }

  async release(tokenHash: string, claimedAt: Date): Promise<void> {
    await prisma.certificate_verification.updateMany({
      where: {
        token_hash: tokenHash,
        claimed_at: claimedAt,
        consumed_at: null
      },
      data: {
        claimed_at: null
      }
    });
  }

  async deleteStale(input: CertificateVerificationCleanupInput): Promise<void> {
    await prisma.certificate_verification.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: input.expiredBefore } },
          { consumed_at: { lt: input.consumedBefore } }
        ]
      }
    });
  }
}
