import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deletePost,
  deletePostComment,
  listPostComments,
  listPosts,
  togglePostCommentLike,
  togglePostLike
} from "./posts";

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
            comentarios: 0,
            likesCount: 7,
            likedByMe: true
          }
        ]
      }), { status: 200 })
    ));

    await expect(listPosts("token")).resolves.toMatchObject([
      {
        id: "15",
        isOwn: true,
        score: 7,
        likedByMe: true
      }
    ]);
  });

  it("toggles a post like through its authenticated route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        liked: true,
        likesCount: 8
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(togglePostLike("15", "token")).resolves.toEqual({
      liked: true,
      likesCount: 8
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/posts/15/like"),
      expect.objectContaining({ method: "POST" })
    );
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
            likesCount: 3,
            likedByMe: true,
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
          isOwn: true,
          likesCount: 3,
          likedByMe: true
        }
      ]
    });

    await deletePostComment("15", "31", "token");

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/posts/15/comentarios/31"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("toggles a comment like through its post-scoped route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        liked: false,
        likesCount: 2
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(togglePostCommentLike("15", "31", "token")).resolves.toEqual({
      liked: false,
      likesCount: 2
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/posts/15/comentarios/31/like"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
