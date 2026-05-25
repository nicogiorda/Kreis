// CAPA API — Capa HTTP del módulo auth
// Responsabilidad única: recibir requests HTTP, validar el input con zod,
// llamar al caso de uso correspondiente y serializar la respuesta.
// No contiene lógica de negocio — eso vive en application/.
// No habla directamente con Supabase ni Prisma — eso vive en infrastructure/.

import { Router } from "express";
import { z } from "zod";
import { LoginUseCase } from "../application/login";
import { RegisterUseCase } from "../application/register";
import { AuthProviderError, ProfileCreationError } from "../domain/auth-errors";
import { PrismaUserRepository } from "../infrastructure/prisma-user-repository";
import { SupabaseAuthProvider } from "../infrastructure/supabase-auth-provider";

// Schemas de validación zod — primera línea de defensa antes de tocar la lógica.
// Si el request no cumple el schema, devolvemos 400 sin llegar al caso de uso.
const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  legajo: z.coerce.number().int().positive(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  id_facultad: z.coerce.number().int().positive()
});

// Instanciamos las implementaciones concretas de infrastructure e inyectamos
// en los casos de uso. Si en el futuro usamos un contenedor de DI (tsyringe,
// inversify), este wiring se movería allí.
const authProvider = new SupabaseAuthProvider();
const userRepository = new PrismaUserRepository();
const registerUseCase = new RegisterUseCase(authProvider, userRepository);
const loginUseCase = new LoginUseCase(authProvider);

export function createAuthRouter(): Router {
  const router = Router();

  // POST /auth/register — crea un usuario nuevo en Supabase y su perfil en la BD.
  router.post("/register", async (request, response, next) => {
    try {
      const parsedBody = registerRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid register payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const user = await registerUseCase.execute(parsedBody.data);

      response.status(201).json({ user });
    } catch (error) {
      // AuthProviderError: Supabase rechazó la creación (email ya existe, etc.).
      if (error instanceof AuthProviderError) {
        response.status(400).json({
          error: { code: "register_failed", message: error.message }
        });
        return;
      }

      // ProfileCreationError: la BD falló al crear el perfil (el rollback en Supabase
      // ya fue ejecutado por el caso de uso antes de relanzar el error).
      if (error instanceof ProfileCreationError) {
        response.status(500).json({
          error: { code: "profile_creation_failed", message: error.message }
        });
        return;
      }

      next(error);
    }
  });

  // POST /auth/login — autentica con email y contraseña, devuelve sesión JWT.
  router.post("/login", async (request, response, next) => {
    try {
      const parsedBody = loginRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid login payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const session = await loginUseCase.execute(parsedBody.data);

      response.json(session);
    } catch (error) {
      // AuthProviderError: credenciales incorrectas o usuario inexistente.
      if (error instanceof AuthProviderError) {
        response.status(401).json({
          error: { code: "invalid_credentials", message: error.message }
        });
        return;
      }

      next(error);
    }
  });

  // POST /auth/logout — el logout es stateless porque Supabase usa JWT.
  // El cliente invalida el token localmente; el backend no guarda sesiones.
  // Este endpoint existe para mantener la simetría REST y facilitar futuros cambios.
  router.post("/logout", (_request, response) => {
    response.status(204).send();
  });

  return router;
}
