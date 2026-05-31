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

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../../core/config";
import { findUserProfileByAuthId, listFacultades, listTopicos } from "../data/users-repository";
import { serializeUserProfile } from "./serialize-user-profile";

// Cliente Supabase con la anon key, usado unicamente para verificar el JWT
// del usuario. getUser(token) valida la firma y la expiracion del token.
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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

  return router;
}

