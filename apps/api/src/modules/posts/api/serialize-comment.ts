import type { PostCommentTree } from "../data/posts-repository";

export function serializeComment(comment: PostCommentTree, viewerLegajo: number): {
  id: string;
  id_post: string;
  id_padre: string | null;
  cuerpo: string;
  created_at: string;
  autor: {
    legajo: number;
    nombre: string;
    apellido: string;
    avatar_url: string | null;
  };
  es_autor: boolean;
  likesCount: number;
  likedByMe: boolean;
  respuestas: ReturnType<typeof serializeComment>[];
} {
  return {
    id: comment.id_comentario.toString(),
    id_post: comment.id_post.toString(),
    id_padre: comment.id_padre?.toString() ?? null,
    cuerpo: comment.cuerpo,
    created_at: comment.created_at.toISOString(),
    autor: {
      legajo: comment.usuario.legajo,
      nombre: comment.usuario.nombre,
      apellido: comment.usuario.apellido,
      avatar_url: comment.usuario.avatar_url
    },
    es_autor: comment.usuario.legajo === viewerLegajo,
    likesCount: comment._count.like,
    likedByMe: comment.like.length > 0,
    respuestas: comment.respuestas.map((reply) => serializeComment(reply, viewerLegajo))
  };
}
