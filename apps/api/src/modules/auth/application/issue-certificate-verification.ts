import type {
  CertificateVerificationIdentity,
  ICertificateVerificationRepository
} from "../domain/certificate-verification";
import { normalizeCertificateVerificationIdentity } from "../domain/certificate-verification";
import { RegistrationEmailDomainError } from "../domain/auth-errors";
import { isAllowedRegistrationEmail } from "../domain/registration-email";
import { createCertificateVerificationToken } from "../infrastructure/certificate-verification-token";

const staleVerificationRetentionMs = 24 * 60 * 60 * 1000;

export type IssuedCertificateVerification = {
  token: string;
  expires_at: string;
};

type CertificateVerificationFaculty = {
  idFacultad: number;
};

type Clock = () => Date;

type IssueCertificateVerificationOptions = {
  allowedEmailDomains?: ReadonlySet<string>;
  clock?: Clock;
};

export class IssueCertificateVerificationUseCase {
  private readonly allowedEmailDomains: ReadonlySet<string>;
  private readonly clock: Clock;

  constructor(
    private readonly verificationRepository: ICertificateVerificationRepository,
    private readonly ttlMinutes: number,
    options: IssueCertificateVerificationOptions = {}
  ) {
    this.allowedEmailDomains = options.allowedEmailDomains ?? new Set(["uade.edu.ar"]);
    this.clock = options.clock ?? (() => new Date());
  }

  async execute(
    certificateIsValid: boolean,
    identity: CertificateVerificationIdentity,
    faculty: CertificateVerificationFaculty | null
  ): Promise<IssuedCertificateVerification | null> {
    if (!certificateIsValid || !faculty) return null;

    if (!isAllowedRegistrationEmail(identity.email, this.allowedEmailDomains)) {
      throw new RegistrationEmailDomainError();
    }

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
      idFacultad: faculty.idFacultad,
      expiresAt
    });

    return {
      token: token.rawToken,
      expires_at: expiresAt.toISOString()
    };
  }
}
