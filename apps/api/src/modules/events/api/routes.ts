import { Router } from "express";
import { z } from "zod";
import { findAcceptedEventById, listAcceptedEvents } from "../data/events-repository";
import { serializeEvent } from "./serialize-event";

const eventIdParamsSchema = z.object({
  id_evento: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id del evento debe ser numerico")
    .transform((id) => BigInt(id))
});

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
