import { afterEach, describe, expect, it, vi } from "vitest";
import { deletePost, listPosts } from "./posts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("posts api", () => {
  it("maps server-side post ownership into the feed model", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        posts: [
          {
            id: "15",
            cuerpo: "Mi publicacion",
            created_at: new Date().toISOString(),
            autor: {
              legajo: 10,
              nombre: "Nico",
              apellido: "G",
              avatar_url: null
            },
            comunidad: {
              id: "2",
              nombre: "Kreis"
            },
            es_autor: true,
            comentarios: 0
          }
        ]
      }), { status: 200 })
    ));

    await expect(listPosts("token")).resolves.toMatchObject([
      {
        id: "15",
        isOwn: true
      }
    ]);
  });

  it("deletes a post through its authenticated route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deletePost("15", "token");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/posts/15"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
