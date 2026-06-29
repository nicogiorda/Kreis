import { type Request, Router } from "express";
import { z } from "zod";
import { verifyAccessToken } from "../../auth/infrastructure/access-token-verifier";
import {
  actualizarEstadoReporte,
  crearReporte,
  findUserByAuthId,
  listarReportes,
  type EstadoReporte,
  type TipoReporte
} from "../data/reports-repository";
import { serializeReporte } from "./serialize-report";

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

type AuthenticatedReportUser =
  | { ok: true; user: { legajo: number; rol: string } }
  | { ok: false; status: number; error: { code: string; message: string } };

async function authenticateReportUser(request: Request): Promise<AuthenticatedReportUser> {
  const accessToken = getBearerToken(request.headers.authorization);

  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      error: {
        code: "missing_token",
        message: "Authorization Bearer token is required"
      }
    };
  }

  const verification = await verifyAccessToken(accessToken);
  if (!verification.ok) return verification;

  const user = await findUserByAuthId(verification.authId);

  if (!user) {
    return {
      ok: false,
      status: 403,
      error: {
        code: "profile_not_found",
        message: "Authenticated user does not have a Kreis profile"
      }
    };
  }

  return { ok: true, user };
}

async function authenticateAdminReportUser(request: Request): Promise<AuthenticatedReportUser> {
  const result = await authenticateReportUser(request);

  if (!result.ok) return result;

  if (result.user.rol !== "Administrador") {
    return {
      ok: false,
      status: 403,
      error: {
        code: "forbidden",
        message: "Esta accion requiere rol Administrador"
      }
    };
  }

  return result;
}

const rawReportCreationSchema = z.object({
  tipoReporte: z.unknown().optional(),
  tipo_reporte: z.unknown().optional(),
  targetType: z.unknown().optional(),
  idObjetivo: z.unknown().optional(),
  id_objetivo: z.unknown().optional(),
  targetId: z.unknown().optional(),
  motivo: z.unknown().optional(),
  reason: z.unknown().optional()
});

const rawReportStatusSchema = z.object({
  estado: z.unknown().optional(),
  status: z.unknown().optional()
});

const rawReportQuerySchema = z.object({
  estado: z.unknown().optional(),
  status: z.unknown().optional(),
  tipoReporte: z.unknown().optional(),
  tipo_reporte: z.unknown().optional(),
  targetType: z.unknown().optional()
});

const reportParamsSchema = z.object({
  id_reporte: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id del reporte debe ser numerico")
    .transform((id) => BigInt(id))
});

function normalizeTipoReporte(value: unknown): TipoReporte | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  if (normalized === "post") return "Post";
  if (normalized === "comentario" || normalized === "comment") return "Comentario";

  return null;
}

function normalizeEstado(value: unknown): EstadoReporte | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  if (normalized === "pendiente" || normalized === "pending") return "Pendiente";
  if (normalized === "desestimado" || normalized === "dismissed") return "Desestimado";
  if (normalized === "resuelto" || normalized === "resolved") return "Resuelto";

  return null;
}

function normalizeBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? BigInt(value) : null;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());

  return null;
}

function normalizeMotivo(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const motivo = value.trim();

  if (motivo.length < 1 || motivo.length > 500) return null;

  return motivo;
}

export function createReportsRouter(): Router {
  const router = Router();

  router.post("/", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticateReportUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const parsedBody = rawReportCreationSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid report payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const tipoReporte = normalizeTipoReporte(
        parsedBody.data.tipoReporte ?? parsedBody.data.tipo_reporte ?? parsedBody.data.targetType
      );
      const idObjetivo = normalizeBigInt(
        parsedBody.data.idObjetivo ?? parsedBody.data.id_objetivo ?? parsedBody.data.targetId
      );
      const motivo = normalizeMotivo(parsedBody.data.motivo ?? parsedBody.data.reason);

      if (!tipoReporte || !idObjetivo || !motivo) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "El reporte requiere tipoReporte, idObjetivo y motivo validos"
          }
        });
        return;
      }

      const result = await crearReporte(authenticatedUser.user.legajo, {
        tipoReporte,
        idObjetivo,
        motivo
      });

      if (result.estado === "objetivo_no_encontrado") {
        response.status(404).json({
          error: {
            code: "target_not_found",
            message: "El post o comentario reportado no existe"
          }
        });
        return;
      }

      if (result.estado === "duplicado") {
        response.status(409).json({
          error: {
            code: "duplicate_report",
            message: "Ya reportaste este contenido"
          },
          reporte: serializeReporte(result.reporte)
        });
        return;
      }

      response.status(201).json({
        reporte: serializeReporte(result.reporte)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticateAdminReportUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const parsedQuery = rawReportQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid report query",
            details: parsedQuery.error.flatten().fieldErrors
          }
        });
        return;
      }

      const estado = normalizeEstado(parsedQuery.data.estado ?? parsedQuery.data.status) ?? undefined;
      const tipoReporte = normalizeTipoReporte(
        parsedQuery.data.tipoReporte ?? parsedQuery.data.tipo_reporte ?? parsedQuery.data.targetType
      ) ?? undefined;

      const reportes = await listarReportes({ estado, tipoReporte });

      response.json({
        reportes: reportes.map(serializeReporte)
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/admin/:id_reporte/status", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticateAdminReportUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const parsedParams = reportParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid report id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const parsedBody = rawReportStatusSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid report status payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const estado = normalizeEstado(parsedBody.data.estado ?? parsedBody.data.status);

      if (!estado) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "El campo estado debe ser Pendiente, Desestimado o Resuelto"
          }
        });
        return;
      }

      const reporte = await actualizarEstadoReporte(
        parsedParams.data.id_reporte,
        estado,
        authenticatedUser.user.legajo
      );

      if (!reporte) {
        response.status(404).json({
          error: {
            code: "not_found",
            message: "Reporte no encontrado"
          }
        });
        return;
      }

      response.json({
        reporte: serializeReporte(reporte)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
