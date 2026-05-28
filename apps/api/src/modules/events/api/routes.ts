import { createClient } from "@supabase/supabase-js";
import { Router } from "express";
import { z } from "zod";
import { config } from "../../../core/config";
import {
  createPendingEvent,
  findAcceptedEventById,
  findUserByAuthId,
  listAcceptedEvents,
  listAcceptedEventsLimit
} from "../data/events-repository";
import { serializeEvent } from "./serialize-event";
import { serializeEventSummary } from "./serialize-event-summary";

const ARGENTINA_TIMEZONE_OFFSET = "-03:00";
const DATE_HAS_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function parseArgentinaDateTime(value: string): Date | null {
  const trimmedValue = value.trim();

  if (!DATE_HAS_TIMEZONE.test(trimmedValue) && !LOCAL_DATE_TIME.test(trimmedValue)) {
    return null;
  }

  const normalizedValue = DATE_HAS_TIMEZONE.test(trimmedValue)
    ? trimmedValue
    : `${trimmedValue}${ARGENTINA_TIMEZONE_OFFSET}`;
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

const eventIdParamsSchema = z.object({
  id_evento: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id del evento debe ser numerico")
    .transform((id) => BigInt(id))
});

const eventCreationSchema = z.object({
  nombre: z.string().trim().min(1),
  ubicacion: z.string().trim().min(1).optional(),
  fecha_inicio: z.string().trim().transform((value, context) => {
    const parsedDate = parseArgentinaDateTime(value);

    if (!parsedDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fecha_inicio debe ser ISO. Si no incluye timezone, se interpreta como hora de Argentina"
      });
      return z.NEVER;
    }

    return parsedDate;
  }),
  descripcion: z.string().trim().min(1).optional(),
  topicos: z.array(z.coerce.number().int().positive()).default([])
});

export function createEventsRouter(): Router {
  const router = Router();

  router.post("/", async (request, response, next) => {
    try {
      const accessToken = getBearerToken(request.headers.authorization);

      if (!accessToken) {
        response.status(401).json({
          error: {
            code: "missing_token",
            message: "Authorization Bearer token is required"
          }
        });
        return;
      }

      const { data: authData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

      if (authError || !authData.user) {
        response.status(401).json({
          error: {
            code: "invalid_token",
            message: authError?.message ?? "Invalid access token"
          }
        });
        return;
      }

      const parsedBody = eventCreationSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid event payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const user = await findUserByAuthId(authData.user.id);

      if (!user) {
        response.status(403).json({
          error: {
            code: "profile_not_found",
            message: "Authenticated user does not have a Kreis profile"
          }
        });
        return;
      }

      const event = await createPendingEvent({
        ...parsedBody.data,
        legajo: user.legajo
      });

      response.status(201).json({
        event: serializeEvent(event)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/accepted/summary/limit", async (_request, response, next) => {
    try {
      const events = await listAcceptedEventsLimit();

      response.json({
        events: events.map(serializeEventSummary)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/accepted/summary/all", async (_request, response, next) => {
    try {
      const events = await listAcceptedEvents();

      response.json({
        events: events.map(serializeEventSummary)
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
