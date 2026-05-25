// serialize-user-profile.ts — Capa de serializacion del perfil de usuario
//
// Responsabilidad: convertir el objeto que devuelve Prisma (con tipos nativos
// de la base de datos) al formato JSON que se envia en la respuesta HTTP.
//
// Por que es necesario serializar?
//   - PostgreSQL usa bigint para los IDs autoincrementales. JavaScript no puede
//     representar bigint en JSON, entonces los convertimos a string.
//   - Los objetos Date de JavaScript se convierten a ISO 8601 para que el
//     cliente los pueda parsear de forma consistente sin importar el timezone.
//
// Por que esta separado de routes.ts?
//   - routes.ts maneja el ciclo HTTP (request, response, errores).
//   - Este archivo solo transforma datos. Esa separacion hace que cada pieza
//     sea mas facil de leer, testear y modificar de forma independiente.
//
// Que devuelve serializeUserProfile?
//   - Datos del usuario y su facultad
//   - eventos_creados: eventos donde el usuario es el autor
//   - eventos_anotado: eventos donde el usuario se inscribio como asistente
//   - comunidades_creadas: comunidades donde el usuario es el autor
//   - comunidades_miembro: comunidades donde el usuario participa como miembro
//   - intereses: lista de intereses declarados por el usuario

import type { UserProfileWithRelations } from "../data/users-repository";

// Extraemos los tipos de evento y comunidad directamente del tipo principal
// para no duplicar la definicion y mantenernos en sincronia automaticamente.
type EventSummary = UserProfileWithRelations["evento"][number];
type ComunidadSummary = UserProfileWithRelations["comunidad"][number];

// JSON no soporta bigint de forma nativa, entonces lo convertimos a string.
// Todos los IDs que vienen de Prisma como bigint pasan por aqui antes de
// ser enviados en la respuesta HTTP.
function serializeBigInt(value: bigint): string {
  return value.toString();
}

// Convierte un objeto Date al formato ISO 8601 (ej: "2025-05-25T14:00:00.000Z").
// Usamos siempre UTC para evitar problemas de timezone entre servidor y cliente.
function serializeDate(value: Date): string {
  return value.toISOString();
}

// Convierte un evento del formato interno de Prisma al formato que va en el JSON
// de la respuesta. Aplica serializeBigInt y serializeDate donde corresponde.
function serializeEvent(event: EventSummary) {
  return {
    id_evento: serializeBigInt(event.id_evento),
    nombre: event.nombre,
    ubicacion: event.ubicacion,
    fecha_inicio: serializeDate(event.fecha_inicio),
    descripcion: event.descripcion,
    estado: event.estado,
    created_at: serializeDate(event.created_at),
    // Aplanamos la tabla intermedia evento_tag para devolver solo el array de tags
    tags: event.evento_tag.map((et) => ({
      id_tag: serializeBigInt(et.tag.id_tag),
      tag: et.tag.tag
    }))
  };
}

// Igual que serializeEvent pero para comunidades.
function serializeComunidad(comunidad: ComunidadSummary) {
  return {
    id_comunidad: serializeBigInt(comunidad.id_comunidad),
    nombre: comunidad.nombre,
    descripcion: comunidad.descripcion,
    estado: comunidad.estado,
    created_at: serializeDate(comunidad.created_at),
    // Aplanamos comunidad_tag de la misma forma que evento_tag
    tags: comunidad.comunidad_tag.map((ct) => ({
      id_tag: serializeBigInt(ct.tag.id_tag),
      tag: ct.tag.tag
    }))
  };
}

// Funcion principal que arma el objeto de respuesta completo del perfil de usuario.
// Separa los eventos/comunidades en dos categorias cada uno:
//   - los que el usuario CREO (relacion directa en la tabla)
//   - los que el usuario INTEGRA como miembro (tabla intermedia user_evento / user_comunidad)
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
    // Eventos donde el usuario es el creador (campo legajo en la tabla evento)
    eventos_creados: user.evento.map(serializeEvent),
    // Eventos donde el usuario se anoto (tabla intermedia user_evento)
    eventos_anotado: user.user_evento.map((ue) => serializeEvent(ue.evento)),
    // Comunidades donde el usuario es el creador (campo legajo en la tabla comunidad)
    comunidades_creadas: user.comunidad.map(serializeComunidad),
    // Comunidades donde el usuario es miembro (tabla intermedia user_comunidad)
    comunidades_miembro: user.user_comunidad.map((uc) => serializeComunidad(uc.comunidad)),
    // Intereses del usuario (tabla intermedia user_interest → interest)
    intereses: user.user_interest.map((ui) => ({
      id_interest: serializeBigInt(ui.interest.id_interest),
      interes: ui.interest.interes
    }))
  };
}
