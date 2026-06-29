// serialize-community.ts — Serialización de comunidades para la respuesta HTTP
//
// Responsabilidad: transformar el objeto que devuelve Prisma (con bigints,
// Dates y relaciones anidadas) en un objeto JSON plano listo para enviar
// al cliente. No ejecuta queries ni sabe nada del transporte HTTP.
//
// Contrato de salida (lo que el cliente recibe por cada comunidad):
//   id          — id numérico como string (bigint no es serializable en JSON)
//   nombre      — nombre de la comunidad
//   descripcion — texto largo de descripción, o null si no tiene
//   miembros    — cantidad total de miembros (de _count.user_comunidad)
//   joined      — true si el usuario autenticado ya pertenece a esta comunidad
//   topicos     — lista de tópicos asociados (id y nombre)
//   created_at  — fecha de creación en formato ISO 8601

import type { CommunityWithRelations } from "../data/communities-repository";

// Serializa una comunidad individual.
// El resultado es el objeto que irá dentro del array "comunidades" de la respuesta.
export function serializeCommunity(community: CommunityWithRelations) {
  return {
    // bigint no es serializable en JSON nativo → lo convertimos a string
    id: community.id_comunidad.toString(),

    nombre: community.nombre,

    // estado permite que el frontend distinga comunidades aprobadas de las propias pendientes
    estado: community.estado,

    // descripcion puede ser null si el creador no la completó
    descripcion: community.descripcion,

    // total de miembros — viene de _count.user_comunidad (consulta independiente del filtro)
    miembros: community._count.user_comunidad,

    // user_comunidad viene filtrado por el legajo del usuario:
    // si hay 1 registro = el usuario está unido, si hay 0 = no está unido
    joined: community.user_comunidad.length > 0,

    // tópicos asociados a esta comunidad (ej: "Diseño", "Gaming", "Tecnología")
    topicos: community.comunidad_topico.map(({ topico }) => ({
      id_topico: topico.id_topico.toString(),
      topico: topico.topico
    })),

    created_at: community.created_at.toISOString()
  };
}
export function serializeCommunityModeration(community: CommunityWithRelations) {
  return {
    id: community.id_comunidad.toString(),
    nombre: community.nombre,
    estado: community.estado,
    descripcion: community.descripcion,
    topicos: community.comunidad_topico.map(({ topico }) => ({
      id_topico: topico.id_topico.toString(),
      topico: topico.topico
    })),
    creador: community.usuario
      ? {
          legajo: community.usuario.legajo,
          nombre: community.usuario.nombre,
          apellido: community.usuario.apellido,
          avatar_url: community.usuario.avatar_url
        }
      : null,
    created_at: community.created_at.toISOString()
  };
}
