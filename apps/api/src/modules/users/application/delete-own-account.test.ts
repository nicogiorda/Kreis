// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { DeleteOwnAccountUseCase } from "./delete-own-account";

function createHarness() {
  const findAccount = vi.fn().mockResolvedValue({
    authId: "auth-1",
    email: "student@uade.edu.ar",
    legajo: 123456
  });
  const reauthenticate = vi.fn().mockResolvedValue(true);
  const deleteAuthUser = vi.fn().mockResolvedValue(true);
  const removeAvatar = vi.fn().mockResolvedValue(undefined);
  const useCase = new DeleteOwnAccountUseCase({
    findAccount,
    reauthenticate,
    deleteAuthUser,
    removeAvatar
  });

  return {
    useCase,
    findAccount,
    reauthenticate,
    deleteAuthUser,
    removeAvatar
  };
}

describe("DeleteOwnAccountUseCase", () => {
  it("reauthenticates and deletes only the authenticated account", async () => {
    const harness = createHarness();

    await harness.useCase.execute("auth-1", "current-password");

    expect(harness.reauthenticate).toHaveBeenCalledWith(
      "auth-1",
      "student@uade.edu.ar",
      "current-password"
    );
    expect(harness.deleteAuthUser).toHaveBeenCalledWith("auth-1");
    expect(harness.removeAvatar).toHaveBeenCalledWith(123456);
  });

  it("rejects an incorrect current password without deleting", async () => {
    const harness = createHarness();
    harness.reauthenticate.mockResolvedValue(false);

    await expect(
      harness.useCase.execute("auth-1", "wrong-password")
    ).rejects.toMatchObject({
      code: "invalid_current_password"
    });
    expect(harness.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("rejects a session without a Kreis profile", async () => {
    const harness = createHarness();
    harness.findAccount.mockResolvedValue(null);

    await expect(
      harness.useCase.execute("auth-1", "current-password")
    ).rejects.toMatchObject({
      code: "profile_not_found"
    });
    expect(harness.reauthenticate).not.toHaveBeenCalled();
  });

  it("does not fail an already deleted account because avatar cleanup failed", async () => {
    const harness = createHarness();
    harness.removeAvatar.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      harness.useCase.execute("auth-1", "current-password")
    ).resolves.toBeUndefined();
    expect(harness.deleteAuthUser).toHaveBeenCalledTimes(1);
  });
});
