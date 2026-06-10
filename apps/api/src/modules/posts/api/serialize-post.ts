import type { CommunityPost } from "../data/posts-repository";

export function serializePost(post: CommunityPost) {
  return {
    id: post.id_post.toString(),
    cuerpo: post.cuerpo,
    created_at: post.created_at.toISOString(),
    autor: {
      legajo: post.usuario.legajo,
      nombre: post.usuario.nombre,
      apellido: post.usuario.apellido
    },
    comunidad: {
      id: post.comunidad.id_comunidad.toString(),
      nombre: post.comunidad.nombre
    },
    comentarios: post._count.comentario
  };
}
