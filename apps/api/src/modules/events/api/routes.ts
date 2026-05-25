import { Router } from "express";
import { z } from "zod";
import { findAcceptedEventById, listAcceptedEvents } from "../data/events-repository";
import { serializeEvent } from "./serialize-event";
//Todos esos imports son necesarios para poder utilizar las funciones y tipos que se encuentran en esos archivos, como la función serializeEvent que se utiliza para convertir los objetos de tipo EventWithRelations a un formato que pueda ser enviado a través de la API, y las funciones findAcceptedEventById y listAcceptedEvents que se utilizan para obtener los eventos aceptados desde el repositorio de eventos. Además, también se importa el tipo z de la librería zod para validar los parámetros de entrada en las rutas de la API.


// El esquema eventIdParamsSchema se define utilizando la librería zod para validar que el parámetro id_evento sea una cadena de texto que contenga solo dígitos y que luego se transforme a un valor de tipo bigint. Esto es necesario para asegurarnos de que el id del evento sea válido antes de intentar buscarlo en la base de datos, ya que el id del evento es de tipo bigint en la base de datos y necesitamos convertirlo a ese tipo para poder realizar la consulta correctamente.
const eventIdParamsSchema = z.object({
  id_evento: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id del evento debe ser numerico")
    .transform((id) => BigInt(id))
});

// La función createEventsRouter crea un router de Express que define las rutas para obtener la lista de eventos aceptados y para obtener un evento específico por su id. En cada ruta, se utilizan las funciones del repositorio de eventos para obtener los datos necesarios y luego se utiliza la función serializeEvent para convertir los objetos de tipo EventWithRelations a un formato que pueda ser enviado a través de la API. Además, también se manejan los errores y se envían respuestas con códigos de estado adecuados en caso de que ocurra algún error o si el evento no es encontrado o no está aceptado.
export function createEventsRouter(): Router {
  const router = Router();

  router.get("/", async (_request, response, next) => {
    try {
      const events = await listAcceptedEvents();

      response.json({
        events: events.map(serializeEvent)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id_evento", async (request, response, next) => {
    try {
      const parsedParams = eventIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid event id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const event = await findAcceptedEventById(parsedParams.data.id_evento);

      if (!event) {
        response.status(404).json({
          error: {
            code: "event_not_found",
            message: "Evento no encontrado o no aceptado"
          }
        });
        return;
      }

      response.json({
        event: serializeEvent(event)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
