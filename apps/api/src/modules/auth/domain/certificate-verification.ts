export type CertificateVerificationIdentity = {
  email: string;
  legajo: number;
  nombre: string;
  apellido: string;
};

export type NormalizedCertificateVerificationIdentity = {
  email: string;
  legajo: number;
  nombreNormalizado: string;
  apellidoNormalizado: string;
};

export type CreateCertificateVerificationInput =
  NormalizedCertificateVerificationIdentity & {
    tokenHash: string;
    idFacultad: number;
    expiresAt: Date;
  };

export type ClaimCertificateVerificationInput =
  NormalizedCertificateVerificationIdentity & {
    tokenHash: string;
    claimedAt: Date;
  };

export type CertificateVerificationClaimResult =
  | { status: "claimed"; claimedAt: Date; idFacultad: number }
  | { status: "invalid" | "expired" | "used" | "mismatch" };

export type CertificateVerificationCleanupInput = {
  expiredBefore: Date;
  consumedBefore: Date;
};

export interface ICertificateVerificationRepository {
  create(input: CreateCertificateVerificationInput): Promise<void>;
  claim(input: ClaimCertificateVerificationInput): Promise<CertificateVerificationClaimResult>;
  consume(tokenHash: string, claimedAt: Date, consumedAt: Date): Promise<boolean>;
  release(tokenHash: string, claimedAt: Date): Promise<void>;
  deleteStale(input: CertificateVerificationCleanupInput): Promise<void>;
}

export function normalizeCertificateName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeCertificateVerificationIdentity(
  input: CertificateVerificationIdentity
): NormalizedCertificateVerificationIdentity {
  return {
    email: input.email.trim().toLowerCase(),
    legajo: input.legajo,
    nombreNormalizado: normalizeCertificateName(input.nombre),
    apellidoNormalizado: normalizeCertificateName(input.apellido)
  };
}
