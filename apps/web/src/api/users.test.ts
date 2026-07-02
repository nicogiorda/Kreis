import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteMyAccount } from "./users";

describe("users API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes the authenticated account with password confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteMyAccount("access-token", "current-password");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/me"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          password: "current-password",
          confirmation: "ELIMINAR"
        })
      })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token"
    );
  });
});
