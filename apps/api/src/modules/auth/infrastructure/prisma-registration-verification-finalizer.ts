import { prisma } from "../../../core/database";
import type {
  FinalizeRegistrationVerificationsInput,
  IRegistrationVerificationFinalizer
} from "../domain/registration-verification-finalizer";

class VerificationFinalizationConflict extends Error {}

export class PrismaRegistrationVerificationFinalizer
implements IRegistrationVerificationFinalizer {
  async consume(
    input: FinalizeRegistrationVerificationsInput
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (transaction) => {
        const emailResult =
          await transaction.registration_email_verification.updateMany({
            where: {
              verification_token_hash:
                input.emailVerificationTokenHash,
              claimed_at: input.emailClaimedAt,
              consumed_at: null
            },
            data: { consumed_at: input.consumedAt }
          });

        const certificateResult =
          await transaction.certificate_verification.updateMany({
            where: {
              token_hash: input.certificateVerificationTokenHash,
              claimed_at: input.certificateClaimedAt,
              consumed_at: null
            },
            data: { consumed_at: input.consumedAt }
          });

        if (emailResult.count !== 1 || certificateResult.count !== 1) {
          throw new VerificationFinalizationConflict();
        }
      });

      return true;
    } catch (error) {
      if (error instanceof VerificationFinalizationConflict) return false;
      throw error;
    }
  }
}
