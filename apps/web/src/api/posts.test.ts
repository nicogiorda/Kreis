import { afterEach, describe, expect, it, vi } from "vitest";
import { deletePost, deletePostComment, listPostComments, listPosts } from "./posts";

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

  it("maps comment ownership and deletes through the scoped post route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        comentarios: [
          {
            id: "31",
            id_post: "15",
            id_padre: null,
            cuerpo: "Mi comentario",
            created_at: new Date().toISOString(),
            es_autor: true,
            autor: {
              legajo: 10,
              nombre: "Nico",
              apellido: "G",
              avatar_url: null
            },
            respuestas: []
          }
        ],
        total_comentarios: 1
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPostComments("15", "token")).resolves.toMatchObject({
      comments: [
        {
          id: "31",
          isOwn: true
        }
      ]
    });

    await deletePostComment("15", "31", "token");

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/posts/15/comentarios/31"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
