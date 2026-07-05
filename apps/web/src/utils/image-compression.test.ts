import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage } from "./image-compression";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compressImage", () => {
  it("resizes a gallery image and exports a webp file", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 4000,
      height: 3000,
      close
    }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob(["optimized"], { type: "image/webp" }))
    );

    const result = await compressImage(
      new File(["original"], "photo.jpg", { type: "image/jpeg" }),
      {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82,
        fileName: "avatar.webp"
      }
    );

    expect(result.name).toBe("avatar.webp");
    expect(result.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1024,
      768
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects files that are not images", async () => {
    await expect(compressImage(
      new File(["notes"], "notes.txt", { type: "text/plain" }),
      {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82
      }
    )).rejects.toThrow("Seleccioná un archivo de imagen.");
  });
});
