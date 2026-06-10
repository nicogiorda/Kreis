import type { PostCommentTree } from "../data/posts-repository";

export function serializeComment(comment: PostCommentTree): {
  id: string;
  id_post: string;
  id_padre: string | null;
  cuerpo: string;
  created_at: string;
  autor: {
    legajo: number;
    nombre: string;
    apellido: string;
  };
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
      apellido: comment.usuario.apellido
    },
    respuestas: comment.respuestas.map(serializeComment)
  };
}
