import type { ActivityPost, PostComment } from "../types";
import { bearerTokenHeaders, requestJson } from "./client";

type PostResponse = {
  id: string;
  cuerpo: string;
  created_at: string;
  autor: {
    legajo: number;
    nombre: string;
    apellido: string;
    avatar_url?: string | null;
  };
  comunidad: {
    id: string;
    nombre: string;
  };
  es_autor: boolean;
  comentarios: number;
};

type CommentResponse = {
  id: string;
  id_post: string;
  id_padre: string | null;
  cuerpo: string;
  created_at: string;
  autor: {
    legajo: number;
    nombre: string;
    apellido: string;
    avatar_url?: string | null;
  };
  respuestas: CommentResponse[];
};

type CommentsResponse = {
  comentarios: CommentResponse[];
  total_comentarios: number;
};

type CreateCommentResponse = {
  comentario: CommentResponse;
  total_comentarios: number;
};

function getCommunityIcon(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function formatPostTime(createdAt: string): string {
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));

  if (elapsedMinutes < 1) return "ahora";
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `hace ${elapsedHours} h`;

  return `hace ${Math.floor(elapsedHours / 24)} d`;
}

function adaptPost(post: PostResponse): ActivityPost {
  return {
    id: post.id,
    communityId: post.comunidad.id,
    communityName: post.comunidad.nombre,
    icon: getCommunityIcon(post.comunidad.nombre),
    author: `${post.autor.nombre} ${post.autor.apellido}`.trim(),
    isOwn: post.es_autor,
    authorAvatarUrl: post.autor.avatar_url ?? null,
    time: formatPostTime(post.created_at),
    title: "Nuevo post",
    text: post.cuerpo,
    score: 1,
    comments: post.comentarios
  };
}

function adaptComment(comment: CommentResponse): PostComment {
  return {
    id: comment.id,
    postId: comment.id_post,
    parentId: comment.id_padre,
    body: comment.cuerpo,
    createdAt: comment.created_at,
    author: {
      legajo: comment.autor.legajo,
      name: `${comment.autor.nombre} ${comment.autor.apellido}`.trim(),
      avatarUrl: comment.autor.avatar_url ?? null
    },
    replies: comment.respuestas.map(adaptComment)
  };
}

export async function listPosts(accessToken: string, signal?: AbortSignal): Promise<ActivityPost[]> {
  const response = await requestJson<{ posts: PostResponse[] }>("/api/v1/posts", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.posts.map(adaptPost);
}

export async function createPost(
  communityId: string,
  body: string,
  accessToken: string
): Promise<ActivityPost> {
  const response = await requestJson<{ post: PostResponse }>("/api/v1/posts", {
    method: "POST",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({
      id_comunidad: communityId,
      cuerpo: body
    })
  });

  return adaptPost(response.post);
}

export async function deletePost(postId: string, accessToken: string): Promise<void> {
  await requestJson(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: bearerTokenHeaders(accessToken)
  });
}

export async function listPostComments(
  postId: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<{ comments: PostComment[]; total: number }> {
  const response = await requestJson<CommentsResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/comentarios`,
    {
      headers: bearerTokenHeaders(accessToken),
      signal
    }
  );

  return {
    comments: response.comentarios.map(adaptComment),
    total: response.total_comentarios
  };
}

export async function createPostComment(
  postId: string,
  body: string,
  accessToken: string,
  parentId?: string
): Promise<{ comment: PostComment; total: number }> {
  const response = await requestJson<CreateCommentResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/comentarios`,
    {
      method: "POST",
      headers: bearerTokenHeaders(accessToken),
      body: JSON.stringify({
        cuerpo: body,
        id_padre: parentId
      })
    }
  );

  return {
    comment: adaptComment(response.comentario),
    total: response.total_comentarios
  };
}
