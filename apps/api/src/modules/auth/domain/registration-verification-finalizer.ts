export type FinalizeRegistrationVerificationsInput = {
  emailVerificationTokenHash: string;
  emailClaimedAt: Date;
  certificateVerificationTokenHash: string;
  certificateClaimedAt: Date;
  consumedAt: Date;
};

export interface IRegistrationVerificationFinalizer {
  consume(
    input: FinalizeRegistrationVerificationsInput
  ): Promise<boolean>;
}
