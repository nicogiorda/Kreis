// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createAccountCreatedResponse } from "./register-response";

describe("register response", () => {
  it("returns an account-created response without another OTP", () => {
    const response = createAccountCreatedResponse(
      " Student@UADE.edu.ar "
    );

    expect(response).toEqual({
      status: "account_created",
      email: "student@uade.edu.ar"
    });
    expect(response).not.toHaveProperty("session");
  });
});
