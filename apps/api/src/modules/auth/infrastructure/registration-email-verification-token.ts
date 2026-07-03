import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";

const verificationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createRegistrationEmailCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashRegistrationEmailCode(
  email: string,
  code: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function registrationEmailCodeMatches(
  expectedHash: string,
  actualHash: string
): boolean {
  if (expectedHash.length !== actualHash.length) return false;

  return timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(actualHash, "hex")
  );
}

export function createRegistrationEmailVerificationToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");

  return {
    rawToken,
    tokenHash: hashRegistrationEmailVerificationToken(rawToken)
  };
}

export function hashRegistrationEmailVerificationToken(
  rawToken: string
): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function isRegistrationEmailVerificationTokenValid(
  rawToken: string
): boolean {
  return verificationTokenPattern.test(rawToken);
}
