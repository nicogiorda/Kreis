// routes.ts — Rutas HTTP del módulo de comunidades
//
// Responsabilidad: recibir requests HTTP, autenticar al usuario si corresponde,
// llamar al repositorio y devolver la respuesta serializada. No ejecuta queries
// directamente ni conoce la lógica de negocio — solo orquesta.
//
// Rutas implementadas:
//   GET /    → lista todas las comunidades aceptadas (auth opcional)
//
// Patrón de autenticación:
//   authenticateUser         → require token válido, devuelve { legajo }
//   authenticateOptionalUser → si hay token lo valida; si no hay, sigue como anónimo
//
// La autenticación opcional permite que usuarios no logueados puedan ver comunidades
// pero sin el campo "joined" personalizado (siempre false).

import { createClient } from "@supabase/supabase-js";
import { type Request, Router } from "express";
import { z } from "zod";
import { config } from "../../../core/config";
import {
  createCommunity,
  findUserByAuthId,
  listAllCommunities,
  listCommunities,
  setCommunityMembership,
  updateCommunityStatus
} from "../data/communities-repository";
import { serializeCommunity } from "./serialize-community";

// Cliente de Supabase usado exclusivamente para verificar tokens JWT entrantes.
// autoRefreshToken y persistSession en false porque este cliente es stateless (no guarda sesión).
const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Extrae el token del header Authorization: Bearer <token>.
// Devuelve null si el header no existe, está mal formado o el scheme no es "bearer".
function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

// Tipo discriminado para el resultado de autenticación.
// ok: true  → autenticación exitosa, user contiene legajo y rol
// ok: false → falló la autenticación, status y error para armar la respuesta HTTP
type AuthenticatedUser =
  | { ok: true; user: { legajo: number; rol: string } }
  | { ok: false; status: number; error: { code: string; message: string } };

// Autentica al usuario de forma obligatoria.
// Valida el token con Supabase y luego busca el perfil en nuestra base.
// Se usa en rutas que requieren identidad del usuario (crear, unirse, etc.)
async function authenticateUser(request: Request): Promise<AuthenticatedUser> {
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

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return {
      ok: false,
      status: 401,
      error: {
        code: "invalid_token",
        message: authError?.message ?? "Invalid access token"
      }
    };
  }

  // Resolvemos el legajo a partir del auth_id — el cliente nunca manda el legajo directamente
  const user = await findUserByAuthId(authData.user.id);

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

// Autentica al usuario y verifica que tenga rol Administrador.
// Usado exclusivamente en rutas de moderación/administración.
async function authenticateAdminUser(request: Request): Promise<AuthenticatedUser> {
  const result = await authenticateUser(request);

  if (!result.ok) return result;

  if (result.user.rol !== "Administrador") {
    return {
      ok: false,
      status: 403,
      error: {
        code: "forbidden",
        message: "Esta acción requiere rol Administrador"
      }
    };
  }

  return result;
}

// Autentica al usuario de forma opcional.
// Si no hay token en el header, devuelve user: null sin error.
// Si hay token pero es inválido, devuelve el error correspondiente.
// Se usa en rutas donde el contenido es público pero la respuesta se personaliza si hay sesión.
async function authenticateOptionalUser(
  request: Request
): Promise<AuthenticatedUser | { ok: true; user: null }> {
  if (!getBearerToken(request.headers.authorization)) {
    return { ok: true, user: null };
  }

  return authenticateUser(request);
}

const communityIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id de la comunidad debe ser numerico")
    .transform((id) => BigInt(id))
});

export function createCommunitiesRouter(): Router {
  const router = Router();

  // Crea una nueva comunidad con estado "Pendiente" de manera predeterminada!!! Luego deberá de ser aceptada por un admin para que aparezca en la lista pública.
  // Requiere autenticación — el legajo del creador se extrae del JWT, no del body.
  // El creador queda automáticamente como miembro de la comunidad recién creada.
  //
  // Body esperado:
  //   nombre      (string, requerido)
  //   descripcion (string, opcional)
  //   topicos     (number[], opcional) — ids de tópicos a vincular
  router.post("/", async (request, response, next) => {
    try {
      const authResult = await authenticateUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const { nombre, descripcion, topicos } = (request.body as {
        nombre?: unknown;
        descripcion?: unknown;
        topicos?: unknown;
      } | undefined) ?? {};

      // Validación mínima: nombre es obligatorio y debe ser un string no vacío
      if (typeof nombre !== "string" || nombre.trim() === "") {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "El campo 'nombre' es requerido y debe ser un string no vacío"
          }
        });
        return;
      }

      // Normalizamos topicos: si viene como array de números lo usamos, si no ignoramos
      const topicosNormalizados =
        Array.isArray(topicos) && topicos.every((t) => typeof t === "number")
          ? (topicos as number[])
          : [];

      const community = await createCommunity(authResult.user.legajo, {
        nombre: nombre.trim(),
        descripcion: typeof descripcion === "string" ? descripcion.trim() : undefined,
        topicos: topicosNormalizados
      });

      // 201 Created — la comunidad fue creada (en estado Pendiente, pendiente de aprobación)
      response.status(201).json({ comunidad: serializeCommunity(community) });
    } catch (error) {
      next(error);
    }
  });

  // Devuelve la lista de comunidades en estado Aceptado.
  // Si el usuario envía token, el campo "joined" refleja si ya es miembro de cada comunidad.
  // Si no hay token, "joined" es siempre false (respuesta pública sin personalización). Luego en el front se filta por tópicos!
  router.get("/", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticateOptionalUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      // Pasamos el legajo al repositorio para que filtre user_comunidad por usuario.
      // Si es anónimo (user: null), se usa undefined → el repositorio usa -1 como sentinel.
      const communities = await listCommunities(authenticatedUser.user?.legajo);

      response.json({
        comunidades: communities.map(serializeCommunity)
      });
    } catch (error) {
      next(error);
    }
  });

  // ruta para unirse a una comunidad!
  router.post("/:id/members", async (request, response, next) => {
    try {
      const parsedParams = communityIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid community id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const authResult = await authenticateUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const membership = await setCommunityMembership(
        authResult.user.legajo,
        parsedParams.data.id,
        true
      );

      if (!membership) {
        response.status(404).json({
          error: {
            code: "community_not_found",
            message: "Comunidad no encontrada o no aceptada"
          }
        });
        return;
      }

      response.json({
        membership: {
          legajo: membership.legajo,
          id_comunidad: membership.id_comunidad.toString(),
          joined: membership.joined,
          miembros: membership.miembros
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // ruta para salir de una comunidad (elimina la membresía del usuario autenticado en la comunidad indicada por id)!
  router.delete("/:id/members", async (request, response, next) => {
    try {
      const parsedParams = communityIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid community id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const authResult = await authenticateUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const membership = await setCommunityMembership(
        authResult.user.legajo,
        parsedParams.data.id,
        false
      );

      if (!membership) {
        response.status(404).json({
          error: {
            code: "community_not_found",
            message: "Comunidad no encontrada o no aceptada"
          }
        });
        return;
      }

      response.json({
        membership: {
          legajo: membership.legajo,
          id_comunidad: membership.id_comunidad.toString(),
          joined: membership.joined,
          miembros: membership.miembros
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // [ADMIN] Devuelve todas las comunidades sin importar el estado.
  // Útil para que los admins vean qué comunidades están pendientes de aprobación.
  // Requiere rol Administrador — devuelve 403 si el usuario no lo tiene.
  router.get("/admin", async (request, response, next) => {
    try {
      const authResult = await authenticateAdminUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const communities = await listAllCommunities();

      response.json({ comunidades: communities.map(serializeCommunity) });
    } catch (error) {
      next(error);
    }
  });

  // [ADMIN] Cambia el estado de una comunidad a aceptado o rechazado!!
  // Requiere rol Administrador.
  // Params: id — id_comunidad de la comunidad a modificar
  // Body:   estado — "Pendiente" | "Aceptado" | "Rechazado"
  router.patch("/admin/:id/status", async (request, response, next) => {
    try {
      const authResult = await authenticateAdminUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const { estado } = request.body as { estado?: unknown };
      const VALID_STATUSES = ["Pendiente", "Aceptado", "Rechazado"] as const;

      if (!VALID_STATUSES.includes(estado as (typeof VALID_STATUSES)[number])) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: `El campo 'estado' debe ser uno de: ${VALID_STATUSES.join(", ")}`
          }
        });
        return;
      }

      const id = BigInt(request.params.id);
      const updated = await updateCommunityStatus(id, estado as (typeof VALID_STATUSES)[number]);

      if (!updated) {
        response.status(404).json({
          error: { code: "not_found", message: "Comunidad no encontrada" }
        });
        return;
      }

      response.json({ comunidad: serializeCommunity(updated) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
