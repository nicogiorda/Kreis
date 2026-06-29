// routes.ts — Capa HTTP del modulo de usuarios
//
// Responsabilidad: definir los endpoints del modulo, validar los parametros
// que llegan en el request y coordinar la respuesta HTTP.
//
// Este archivo NO contiene logica de negocio ni consultas a la base de datos.
// Solo orquesta: recibe el request, valida, llama al repositorio, serializa
// y devuelve la respuesta (o el error correspondiente).
//
// Endpoint implementado:
//   GET /users/me
//     Devuelve el perfil del usuario autenticado.
//     El usuario se identifica por el JWT enviado en el header Authorization,
//     nunca por un parametro de la URL. Esto impide que un usuario pueda
//     acceder al perfil de otro conociendo su legajo.
//
//     - 401 si no hay token o el token es invalido / expirado
//     - 404 si el token es valido pero el usuario no tiene perfil en la BD
//     - 200 con el perfil serializado si todo esta bien

import multer from "multer";
import sharp from "sharp";
import { type NextFunction, type Request, type Response, Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../../core/config";
import { findUserAuthIdByLegajo, findUserProfileByAuthId, listFacultades, listTopicos, listUsersForAdministration, updateUserAvatarUrl, updateUserRol } from "../data/users-repository";
import { serializeUserProfile } from "./serialize-user-profile";

// Cliente Supabase con la anon key, usado unicamente para verificar el JWT
// del usuario. getUser(token) valida la firma y la expiracion del token.
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const avatarFieldName = "avatar";
const avatarBucketName = "profile-images";
const maxAvatarSizeBytes = 2 * 1024 * 1024;
const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxAvatarSizeBytes,
    files: 1
  },
  fileFilter(_request, file, callback) {
    if (!allowedAvatarMimeTypes.has(file.mimetype)) {
      callback(new Error("La foto de perfil debe ser JPG, PNG o WebP."));
      return;
    }

    callback(null, true);
  }
});


function uploadAvatar(request: Request, response: Response, next: NextFunction): void {
  avatarUpload.single(avatarFieldName)(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        error: {
          code: "avatar_too_large",
          message: "La foto de perfil no puede superar los 2 MB."
        }
      });
      return;
    }

    response.status(400).json({
      error: {
        code: "invalid_avatar_file",
        message: error instanceof Error ? error.message : "Foto de perfil invalida."
      }
    });
  });
}
function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

type AuthenticatedUser =
  | { ok: true; user: { legajo: number; rol: string } }
  | { ok: false; status: number; error: { code: string; message: string } };

async function authenticateAdminUser(request: Request): Promise<AuthenticatedUser> {
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

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: {
        code: "invalid_token",
        message: error?.message ?? "Invalid access token"
      }
    };
  }

  const user = await findUserProfileByAuthId(data.user.id);

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

  if (user.rol !== "Administrador") {
    return {
      ok: false,
      status: 403,
      error: {
        code: "forbidden",
        message: "Esta accion requiere rol Administrador"
      }
    };
  }

  return { ok: true, user: { legajo: user.legajo, rol: user.rol } };
}
export function createUsersRouter(): Router {
  const router = Router();


  router.get("/topicos", async (_request, response, next) => {
    try {
      const topicos = await listTopicos();

      response.json({
        topicos: topicos.map((topico) => ({
          id_topico: topico.id_topico.toString(),
          topico: topico.topico
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/facultades", async (_request, response, next) => {
    try {
      const facultades = await listFacultades();

      response.json({
        facultades: facultades.map((facultad) => ({
          id_facultad: facultad.id_facultad.toString(),
          nombre: facultad.nombre
        }))
      });
    } catch (error) {
      next(error);
    }
  });
  // GET /users/me
  // Devuelve el perfil completo del usuario que esta haciendo el request.
  // Requiere header: Authorization: Bearer <jwt>
  router.get("/me", async (request, response, next) => {
    try {
      // Extraemos el token del header Authorization: Bearer <token>
      const authHeader = request.headers["authorization"];
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) {
        response.status(401).json({
          error: {
            code: "unauthorized",
            message: "Se requiere autenticacion"
          }
        });
        return;
      }

      // Verificamos el token contra Supabase. Si es invalido o expiro, devuelve error.
      // El auth_id resultante es el UUID del usuario en el sistema de auth.
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        response.status(401).json({
          error: {
            code: "invalid_token",
            message: "Token invalido o expirado"
          }
        });
        return;
      }

      // Buscamos el perfil usando el auth_id del JWT, no un param de la URL.
      // Asi un usuario solo puede ver su propio perfil.
      const user = await findUserProfileByAuthId(data.user.id);

      if (!user) {
        response.status(404).json({
          error: {
            code: "profile_not_found",
            message: "Perfil de usuario no encontrado"
          }
        });
        return;
      }

      // Serializamos (bigint → string, Date → ISO) y devolvemos el perfil
      response.json({ user: serializeUserProfile(user) });
    } catch (error) {
      // Delegamos cualquier error inesperado al middleware de errores global de Express
      next(error);
    }
  });

  // POST /users/me/avatar
  // Actualiza la foto de perfil del usuario autenticado.
  // Requiere header: Authorization: Bearer <jwt>
  // Body multipart/form-data: avatar=<archivo JPG|PNG|WebP>
  router.post("/me/avatar", uploadAvatar, async (request, response, next) => {
    try {
      const authHeader = request.headers["authorization"];
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) {
        response.status(401).json({
          error: {
            code: "unauthorized",
            message: "Se requiere autenticacion"
          }
        });
        return;
      }

      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        response.status(401).json({
          error: {
            code: "invalid_token",
            message: "Token invalido o expirado"
          }
        });
        return;
      }

      if (!request.file) {
        response.status(400).json({
          error: {
            code: "missing_avatar",
            message: `El archivo debe enviarse en el campo ${avatarFieldName}.`
          }
        });
        return;
      }

      const user = await findUserProfileByAuthId(data.user.id);

      if (!user) {
        response.status(404).json({
          error: {
            code: "profile_not_found",
            message: "Perfil de usuario no encontrado"
          }
        });
        return;
      }

      const avatarBuffer = await sharp(request.file.buffer)
        .rotate()
        .resize(512, 512, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
      const avatarPath = `profiles/${user.legajo}/avatar.webp`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(avatarBucketName)
        .upload(avatarPath, avatarBuffer, {
          contentType: "image/webp",
          upsert: true
        });

      if (uploadError) {
        response.status(502).json({
          error: {
            code: "avatar_upload_failed",
            message: uploadError.message
          }
        });
        return;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(avatarBucketName)
        .getPublicUrl(avatarPath);
      const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
      const updatedUser = await updateUserAvatarUrl(user.legajo, avatarUrl);

      response.json({ user: serializeUserProfile(updatedUser) });
    } catch (error) {
      next(error);
    }
  });
  router.get("/admin", async (request, response, next) => {
    try {
      const authResult = await authenticateAdminUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const users = await listUsersForAdministration();

      response.json({
        users: users.map((user) => ({
          legajo: user.legajo,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.authUser.email,
          rol: user.rol,
          verificado: user.verificado,
          avatar_url: user.avatar_url,
          created_at: user.created_at.toISOString()
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/admin/:legajo", async (request, response, next) => {
    try {
      const authResult = await authenticateAdminUser(request);

      if (!authResult.ok) {
        response.status(authResult.status).json({ error: authResult.error });
        return;
      }

      const legajo = Number(request.params.legajo);

      if (!Number.isInteger(legajo) || legajo <= 0) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "El parametro 'legajo' debe ser un entero positivo"
          }
        });
        return;
      }

      if (authResult.user.legajo === legajo) {
        response.status(400).json({
          error: {
            code: "cannot_delete_self",
            message: "No podes eliminar tu propio usuario administrador desde esta ruta"
          }
        });
        return;
      }

      const userToDelete = await findUserAuthIdByLegajo(legajo);

      if (!userToDelete) {
        response.status(404).json({
          error: {
            code: "not_found",
            message: "Usuario no encontrado"
          }
        });
        return;
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.auth_id);

      if (deleteError) {
        response.status(502).json({
          error: {
            code: "user_delete_failed",
            message: deleteError.message
          }
        });
        return;
      }

      response.json({
        user: {
          legajo: userToDelete.legajo,
          deleted: true
        }
      });
    } catch (error) {
      next(error);
    }
  });
  // [DEV ONLY] Cambia el rol de un usuario por legajo.
  // Esta ruta NO existe en producción — devuelve 404 si NODE_ENV es "production".
  // Sirve para testear rutas protegidas por rol sin tocar la base de datos manualmente.
  //
  // PATCH /users/:legajo/rol
  // Body: { rol: "Estudiante" | "Moderador" | "Administrador" }
  router.patch("/:legajo/rol", async (request, response, next) => {
    // Bloqueamos en producción para que no quede expuesto accidentalmente
    if (config.NODE_ENV === "production") {
      response.status(404).json({ error: { code: "not_found", message: "Not found" } });
      return;
    }

    try {
      const legajo = Number(request.params.legajo);
      const { rol } = (request.body as { rol?: unknown } | undefined) ?? {};
      const VALID_ROLES = ["Estudiante", "Moderador", "Administrador"] as const;

      if (!Number.isInteger(legajo) || legajo <= 0) {
        response.status(400).json({
          error: { code: "validation_error", message: "El parámetro 'legajo' debe ser un entero positivo" }
        });
        return;
      }

      if (!VALID_ROLES.includes(rol as (typeof VALID_ROLES)[number])) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: `El campo 'rol' debe ser uno de: ${VALID_ROLES.join(", ")}`
          }
        });
        return;
      }

      const updated = await updateUserRol(legajo, rol as (typeof VALID_ROLES)[number]);

      if (!updated) {
        response.status(404).json({
          error: { code: "not_found", message: "Usuario no encontrado" }
        });
        return;
      }

      response.json({ legajo: updated.legajo, rol: updated.rol });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

