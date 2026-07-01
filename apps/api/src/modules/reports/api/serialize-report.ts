import type { ReporteConRelaciones } from "../data/reports-repository";

function serializeUsuarioReporte(user: {
  legajo: number;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
} | null) {
  if (!user) return null;

  return {
    legajo: user.legajo,
    nombre: user.nombre,
    apellido: user.apellido,
    avatar_url: user.avatar_url
  };
}

function serializeComunidadReporte(community: {
  id_comunidad: bigint;
  nombre: string;
} | null) {
  if (!community) return null;

  return {
    id_comunidad: community.id_comunidad.toString(),
    nombre: community.nombre
  };
}

export function serializeReporte(reporte: ReporteConRelaciones) {
  const idObjetivo = reporte.tipo_reporte === "Post"
    ? reporte.id_post?.toString() ?? null
    : reporte.id_comentario?.toString() ?? null;
  const autorReporte = reporte.tipo_reporte === "Post"
    ? reporte.post?.usuario ?? reporte.autorSnapshot
    : reporte.comentario?.usuario ?? reporte.autorSnapshot;
  const comunidadReporte = reporte.tipo_reporte === "Post"
    ? reporte.post?.comunidad ?? reporte.comunidadSnapshot
    : reporte.comentario?.post.comunidad ?? reporte.comunidadSnapshot;

  return {
    id_reporte: reporte.id_reporte.toString(),
    tipo_reporte: reporte.tipo_reporte,
    id_objetivo: idObjetivo,
    id_post: reporte.id_post?.toString() ?? null,
    id_comentario: reporte.id_comentario?.toString() ?? null,
    motivo: reporte.motivo,
    estado: reporte.estado,
    contenido_reportado: reporte.contenido_reportado,
    autor_legajo: reporte.autor_legajo,
    id_comunidad: reporte.id_comunidad?.toString() ?? null,
    created_at: reporte.created_at.toISOString(),
    resuelto_at: reporte.resuelto_at?.toISOString() ?? null,
    reportante: serializeUsuarioReporte(reporte.reportante),
    moderador: serializeUsuarioReporte(reporte.moderador),
    autor: serializeUsuarioReporte(autorReporte),
    comunidad: serializeComunidadReporte(comunidadReporte),
    objetivo: reporte.tipo_reporte === "Post"
      ? reporte.post && {
          tipo: "Post" as const,
          post: {
            id_post: reporte.post.id_post.toString(),
            cuerpo: reporte.post.cuerpo,
            created_at: reporte.post.created_at.toISOString(),
            autor: serializeUsuarioReporte(reporte.post.usuario),
            comunidad: serializeComunidadReporte(reporte.post.comunidad)
          }
        }
      : reporte.comentario && {
          tipo: "Comentario" as const,
          comentario: {
            id_comentario: reporte.comentario.id_comentario.toString(),
            id_post: reporte.comentario.id_post.toString(),
            id_padre: reporte.comentario.id_padre?.toString() ?? null,
            cuerpo: reporte.comentario.cuerpo,
            created_at: reporte.comentario.created_at.toISOString(),
            autor: serializeUsuarioReporte(reporte.comentario.usuario),
            post: {
              id_post: reporte.comentario.post.id_post.toString(),
              comunidad: serializeComunidadReporte(reporte.comentario.post.comunidad)
            }
          }
        }
  };
}
