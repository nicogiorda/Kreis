// Convierte el perfil de usuario con relaciones a un objeto JSON-seguro.
// Misma razón que en events: bigint y Date no se pueden serializar con JSON.stringify.

import type { UserProfileWithRelations } from "../data/users-repository";

// Tipos auxiliares derivados del repositorio para tipar las funciones helper
// sin repetir la forma completa del objeto en cada firma.
type EventSummary = UserProfileWithRelations["evento"][number];
type ComunidadSummary = UserProfileWithRelations["comunidad"][number];

// bigint → string porque JSON no soporta bigint de forma nativa.
function serializeBigInt(value: bigint): string {
  return value.toString();
}

// Date → ISO 8601 para que el cliente parsee sin ambigüedad de timezone.
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
    avatar_url: user.avatar_url,
    facultad: {
      id_facultad: serializeBigInt(user.facultad.id_facultad),
      nombre: user.facultad.nombre
    },
    // La distinción creados/anotado y creadas/miembro viene de las dos tablas
    // intermedias del schema: un usuario puede crear un evento sin anotarse,
    // o anotarse a uno que creó otro usuario.
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
