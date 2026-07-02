// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createPendingEmailVerificationResponse } from "./register-response";

describe("register response", () => {
  it("returns a pending email verification without a session", () => {
    const response = createPendingEmailVerificationResponse(
      " Student@UADE.edu.ar "
    );

    expect(response).toEqual({
      status: "pending_email_verification",
      email: "student@uade.edu.ar"
    });
    expect(response).not.toHaveProperty("session");
  });
});
