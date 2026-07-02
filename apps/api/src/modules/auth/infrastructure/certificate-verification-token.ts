import { createHash, randomBytes } from "node:crypto";

const certificateVerificationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type CertificateVerificationToken = {
  rawToken: string;
  tokenHash: string;
};

export function hashCertificateVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createCertificateVerificationToken(): CertificateVerificationToken {
  const rawToken = randomBytes(32).toString("base64url");

  return {
    rawToken,
    tokenHash: hashCertificateVerificationToken(rawToken)
  };
}

export function isCertificateVerificationTokenValid(rawToken: string): boolean {
  return certificateVerificationTokenPattern.test(rawToken);
}
