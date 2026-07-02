const emailDomainPattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function parseAllowedEmailDomains(value: string): ReadonlySet<string> {
  const domains = value
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  if (domains.length === 0 || domains.some((domain) => !emailDomainPattern.test(domain))) {
    throw new Error("ALLOWED_EMAIL_DOMAINS contiene un dominio invalido.");
  }

  return new Set(domains);
}

export function isAllowedRegistrationEmail(
  email: string,
  allowedDomains: ReadonlySet<string>
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const separatorIndex = normalizedEmail.lastIndexOf("@");

  if (separatorIndex <= 0 || separatorIndex === normalizedEmail.length - 1) {
    return false;
  }

  return allowedDomains.has(normalizedEmail.slice(separatorIndex + 1));
}
