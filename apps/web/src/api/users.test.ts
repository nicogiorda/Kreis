import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage } from "../utils/image-compression";
import { deleteMyAccount, uploadMyAvatar } from "./users";

vi.mock("../utils/image-compression", () => ({
  compressImage: vi.fn()
}));

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

  it("compresses an avatar before uploading it", async () => {
    const original = new File(["large-photo"], "photo.jpg", {
      type: "image/jpeg"
    });
    const optimized = new File(["small-avatar"], "avatar.webp", {
      type: "image/webp"
    });
    vi.mocked(compressImage).mockResolvedValue(optimized);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        user: {
          legajo: 123456,
          nombre: "Ana",
          apellido: "Diaz",
          avatar_url: "https://example.com/avatar.webp",
          facultad: {
            nombre: "Ingenieria"
          }
        }
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadMyAvatar("access-token", original)).resolves.toMatchObject({
      avatarUrl: "https://example.com/avatar.webp"
    });

    expect(compressImage).toHaveBeenCalledWith(
      original,
      expect.objectContaining({
        maxWidth: 1024,
        maxHeight: 1024,
        fileName: "avatar.webp"
      })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("avatar")).toEqual(optimized);
  });
});
