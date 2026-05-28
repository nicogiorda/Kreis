//Este archivo serialize-event.ts se encarga de convertir los objetos de tipo EventWithRelations a un formato que pueda ser enviado a través de la API, ya que JSON no soporta ciertos tipos de datos como bigint y Date de forma nativa. 
//Además, también se encarga de serializar los usuarios relacionados con el evento, incluyendo el creador del evento y los usuarios interesados en el evento. 
// Esto permite que la información del evento y sus relaciones se puedan enviar correctamente a los clientes que consumen la API.

//el import de EventWithRelations es necesario para definir el tipo de usuario que se va a serializar, ya que el evento tiene una relación con el usuario que lo creó y con los usuarios interesados en el evento. Al importar este tipo, podemos acceder a las propiedades del usuario y serializarlas correctamente en la función serializeUser.
import type { EventWithRelations } from "../data/events-repository";

// El tipo EventUser se define como una intersección de las propiedades del usuario que se encuentran en el evento, lo que nos permite acceder a todas las propiedades necesarias para serializar el usuario correctamente. Esto es necesario porque el evento tiene una relación con el usuario que lo creó y con los usuarios interesados en el evento, y necesitamos acceder a las propiedades de estos usuarios para serializarlos correctamente.
type EventUser = EventWithRelations["usuario"]; // El tipo EventUser se define como una intersección de las propiedades del usuario que se encuentran en el evento, lo que nos permite acceder a todas las propiedades necesarias para serializar el usuario correctamente.


// La función serializeBigInt convierte un valor bigint a una cadena de texto, ya que JSON no soporta el tipo bigint de forma nativa. Esto es necesario para serializar correctamente los campos que son de tipo bigint en el evento y en el usuario.
function serializeBigInt(value: bigint): string {
  return value.toString();
}


// La función serializeDate convierte un valor Date a una cadena de texto en formato ISO, ya que JSON no soporta el tipo Date de forma nativa. Esto es necesario para serializar correctamente los campos que son de tipo Date en el evento y en el usuario.

function serializeDate(value: Date): string {
  return value.toISOString();
}

// La función serializeUser toma un objeto de tipo EventUser y devuelve un nuevo objeto con las propiedades del usuario serializadas correctamente. Esto incluye convertir los campos de tipo bigint a cadenas de texto y los campos de tipo Date a cadenas de texto en formato ISO. Además, también se serializa la facultad a la que pertenece el usuario, incluyendo su id_facultad y su nombre.
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

// La función serializeEvent toma un objeto de tipo EventWithRelations y devuelve un nuevo objeto con las propiedades del evento serializadas correctamente. Esto incluye convertir los campos de tipo bigint a cadenas de texto y los campos de tipo Date a cadenas de texto en formato ISO. Además, también se serializan las relaciones del evento, incluyendo el creador del evento, los tags asociados al evento y los usuarios interesados en el evento.
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
    topicos: event.evento_topico.map((eventTopico) => ({
      id_topico: serializeBigInt(eventTopico.topico.id_topico),
      topico: eventTopico.topico.topico
    })),
    usuarios_interesados: usuariosInteresados,
    cantidad_interesados: usuariosInteresados.length
  };
}

