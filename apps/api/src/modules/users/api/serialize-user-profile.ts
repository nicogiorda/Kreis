import type { UserProfileWithRelations } from "../data/users-repository";

type EventSummary = UserProfileWithRelations["evento"][number];
type ComunidadSummary = UserProfileWithRelations["comunidad"][number];

function serializeBigInt(value: bigint): string {
  return value.toString();
}

function serializeDate(value: Date): string {
  return value.toISOString();
}

function serializeEvent(event: EventSummary) {
  return {
    id_evento: serializeBigInt(event.id_evento),
    nombre: event.nombre,
    ubicacion: event.ubicacion,
    fecha_inicio: serializeDate(event.fecha_inicio),
    descripcion: event.descripcion,
    estado: event.estado,
    created_at: serializeDate(event.created_at),
    topicos: event.evento_topico.map((et) => ({
      id_topico: serializeBigInt(et.topico.id_topico),
      topico: et.topico.topico
    }))
  };
}

function serializeComunidad(comunidad: ComunidadSummary) {
  return {
    id_comunidad: serializeBigInt(comunidad.id_comunidad),
    nombre: comunidad.nombre,
    descripcion: comunidad.descripcion,
    estado: comunidad.estado,
    created_at: serializeDate(comunidad.created_at),
    topicos: comunidad.comunidad_topico.map((ct) => ({
      id_topico: serializeBigInt(ct.topico.id_topico),
      topico: ct.topico.topico
    }))
  };
}

export function serializeUserProfile(user: UserProfileWithRelations) {
  return {
    legajo: user.legajo,
    nombre: user.nombre,
    apellido: user.apellido,
    id_facultad: serializeBigInt(user.id_facultad),
    rol: user.rol,
    verificado: user.verificado,
    created_at: serializeDate(user.created_at),
    facultad: {
      id_facultad: serializeBigInt(user.facultad.id_facultad),
      nombre: user.facultad.nombre
    },
    eventos_creados: user.evento.map(serializeEvent),
    eventos_anotado: user.user_evento.map((ue) => serializeEvent(ue.evento)),
    comunidades_creadas: user.comunidad.map(serializeComunidad),
    comunidades_miembro: user.user_comunidad.map((uc) => serializeComunidad(uc.comunidad)),
    topicos: user.usuario_topico.map((ut) => ({
      id_topico: serializeBigInt(ut.topico.id_topico),
      topico: ut.topico.topico
    }))
  };
}
