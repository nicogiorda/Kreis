import type { EventWithRelations } from "../data/events-repository";

type EventUser = EventWithRelations["usuario"];

function serializeBigInt(value: bigint): string {
  return value.toString();
}

function serializeDate(value: Date): string {
  return value.toISOString();
}

function serializeUser(user: EventUser) {
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
    }
  };
}

export function serializeEvent(event: EventWithRelations) {
  const usuariosInteresados = event.user_evento.map((userEvent) => serializeUser(userEvent.usuario));

  return {
    id_evento: serializeBigInt(event.id_evento),
    legajo: event.legajo,
    nombre: event.nombre,
    ubicacion: event.ubicacion,
    fecha_inicio: serializeDate(event.fecha_inicio),
    descripcion: event.descripcion,
    estado: event.estado,
    created_at: serializeDate(event.created_at),
    creador: serializeUser(event.usuario),
    tags: event.evento_tag.map((eventTag) => ({
      id_tag: serializeBigInt(eventTag.tag.id_tag),
      tag: eventTag.tag.tag
    })),
    usuarios_interesados: usuariosInteresados,
    cantidad_interesados: usuariosInteresados.length
  };
}
