import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { config } from "../../../core/config";

// posible formato de los bodys de las peticiones a los endpoints de auth
const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});


const registerRequestSchema= z.object({
  email: z.string().email(),
  password: z.string().min(8),
  legajo: z.string().min(1),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  facultad : z.string().min(1),
  });

const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export function createAuthRouter(): Router {
  const router = Router();
// definimos rutas para el módulo autenticación!
  router.post("/register", async (request, response, next) => {
    try {
      const parsedBody = registerRequestSchema.safeParse(request.body); // recuperamos el body de la petición 

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

      const { email, password } = parsedBody.data;
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        response.status(400).json({
          error: {
            code: "register_failed",
            message: error.message
          }
        });
        return;
      }

      response.status(201).json({
        user: {
          id: data.user.id,
          email: data.user.email
        }
      });
    } catch (error) {
      next(error);
    }
  });

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

      const { email, password } = parsedBody.data;
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        response.status(401).json({
          error: {
            code: "invalid_credentials",
            message: error.message
          }
        });
        return;
      }

      response.json({
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (_request, response) => {
    response.status(204).send();
  });

  return router;
}
