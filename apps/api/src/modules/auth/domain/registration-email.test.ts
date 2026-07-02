// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  isAllowedRegistrationEmail,
  parseAllowedEmailDomains
} from "./registration-email";

describe("registration email domains", () => {
  it("accepts configured domains case-insensitively", () => {
    const domains = parseAllowedEmailDomains("uade.edu.ar, otra.edu.ar");

    expect(isAllowedRegistrationEmail(" Student@UADE.EDU.AR ", domains)).toBe(true);
    expect(isAllowedRegistrationEmail("student@otra.edu.ar", domains)).toBe(true);
  });

  it("rejects suffix and subdomain lookalikes", () => {
    const domains = parseAllowedEmailDomains("uade.edu.ar");

    expect(isAllowedRegistrationEmail("student@falso-uade.edu.ar", domains)).toBe(false);
    expect(isAllowedRegistrationEmail("student@alumnos.uade.edu.ar", domains)).toBe(false);
    expect(isAllowedRegistrationEmail("student@gmail.com", domains)).toBe(false);
  });

  it("fails fast when the configured list contains an invalid domain", () => {
    expect(() => parseAllowedEmailDomains("uade.edu.ar, dominio invalido")).toThrow(
      "ALLOWED_EMAIL_DOMAINS"
    );
  });
});
