import type { CommunityPost } from "../data/posts-repository";

export function serializePost(post: CommunityPost, viewerLegajo: number) {
  return {
    id: post.id_post.toString(),
    cuerpo: post.cuerpo,
    created_at: post.created_at.toISOString(),
    autor: {
      legajo: post.usuario.legajo,
      nombre: post.usuario.nombre,
      apellido: post.usuario.apellido,
      avatar_url: post.usuario.avatar_url
    },
    comunidad: {
      id: post.comunidad.id_comunidad.toString(),
      nombre: post.comunidad.nombre
    },
    es_autor: post.usuario.legajo === viewerLegajo,
    comentarios: post._count.comentario,
    likesCount: post._count.like,
    likedByMe: post.like.length > 0
  };
}
