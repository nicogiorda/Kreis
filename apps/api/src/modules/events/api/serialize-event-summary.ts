// Serializador para eventos resumidos (EventSummary)
import type { EventSummary } from "../data/events-repository";

export function serializeEventSummary(event: EventSummary) {
  return {
    nombre: event.nombre,
    ubicacion: event.ubicacion,
    fecha_inicio: event.fecha_inicio instanceof Date
      ? event.fecha_inicio.toISOString()
      : event.fecha_inicio
  };
}
