// Convierte un evento con sus relaciones a un objeto JSON-seguro.
// JSON.stringify lanza si encuentra un bigint, y pierde la zona horaria
// en un Date, por eso los convertimos a string antes de enviar.

import type { EventWithRelations } from "../data/events-repository";

// Derivamos el tipo del usuario desde EventWithRelations para que
// si la query del repositorio cambia, este archivo lo detecte en compilación.
type EventUser = EventWithRelations["usuario"];

// bigint → string porque JSON no soporta bigint de forma nativa.
function serializeBigInt(value: bigint): string {
  return value.toString();
}

// Date → ISO 8601 para que el cliente pueda parsear sin ambigüedad de timezone.
function serializeDate(value: Date): string {
  return value.toISOString();
}

function serializeUser(user: EventUser) {
  return {
    legajo: user.legajo,
    nombre: user.nombre,
    apellido: user.apellido,
    facultad: {
      id_facultad: serializeBigInt(user.facultad.id_facultad),
      nombre: user.facultad.nombre
    }
  };
}

export function serializeEvent(event: EventWithRelations, authenticatedLegajo?: number) {
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
    topicos: event.evento_topico.map((eventTopico) => ({
      id_topico: serializeBigInt(eventTopico.topico.id_topico),
      topico: eventTopico.topico.topico
    })),
    usuarios_interesados: usuariosInteresados,
    // Calculado acá para que el cliente no tenga que hacer .length en cada render.
    cantidad_interesados: usuariosInteresados.length,
    interested: authenticatedLegajo
      ? event.user_evento.some((userEvent) => userEvent.usuario.legajo === authenticatedLegajo)
      : false
  };
}

