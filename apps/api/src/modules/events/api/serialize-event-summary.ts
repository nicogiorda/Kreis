// Versión reducida de serializeEvent para el listado del home.
// Solo manda los campos necesarios para mostrar una card —
// evita enviar relaciones completas cuando el cliente no las necesita.
import type { EventSummary } from "../data/events-repository";

export function serializeEventSummary(event: EventSummary) {
  return {
    id_evento: event.id_evento.toString(),
    nombre: event.nombre,
    ubicacion: event.ubicacion,
    // La guarda instanceof Date cubre el caso en que Prisma devuelva un string
    // en vez de un objeto Date (puede pasar con algunas versiones del adapter).
    fecha_inicio: event.fecha_inicio instanceof Date
      ? event.fecha_inicio.toISOString()
      : event.fecha_inicio,
    descripcion: event.descripcion,
    imagen_url: event.imagen_url,
    topicos: event.evento_topico.map((eventTopico) => ({
      id_topico: eventTopico.topico.id_topico.toString(),
      topico: eventTopico.topico.topico
    })),
    interested: event.user_evento.length > 0
  };
}

