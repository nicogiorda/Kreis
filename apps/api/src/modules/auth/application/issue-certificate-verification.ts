import type {
  CertificateVerificationIdentity,
  ICertificateVerificationRepository
} from "../domain/certificate-verification";
import { normalizeCertificateVerificationIdentity } from "../domain/certificate-verification";
import { createCertificateVerificationToken } from "../infrastructure/certificate-verification-token";

const staleVerificationRetentionMs = 24 * 60 * 60 * 1000;

export type IssuedCertificateVerification = {
  token: string;
  expires_at: string;
};

type Clock = () => Date;

export class IssueCertificateVerificationUseCase {
  constructor(
    private readonly verificationRepository: ICertificateVerificationRepository,
    private readonly ttlMinutes: number,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(
    certificateIsValid: boolean,
    identity: CertificateVerificationIdentity
  ): Promise<IssuedCertificateVerification | null> {
    if (!certificateIsValid) return null;

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.ttlMinutes * 60 * 1000);
    const token = createCertificateVerificationToken();

    await this.verificationRepository
      .deleteStale({
        expiredBefore: new Date(now.getTime() - staleVerificationRetentionMs),
        consumedBefore: new Date(now.getTime() - staleVerificationRetentionMs)
      })
      .catch(() => undefined);

    await this.verificationRepository.create({
      ...normalizeCertificateVerificationIdentity(identity),
      tokenHash: token.tokenHash,
      expiresAt
    });

    return {
      token: token.rawToken,
      expires_at: expiresAt.toISOString()
    };
  }
}
