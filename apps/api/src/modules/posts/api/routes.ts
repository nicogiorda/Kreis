import { createClient } from "@supabase/supabase-js";
import { type Request, Router } from "express";
import { z } from "zod";
import { config } from "../../../core/config";
import {
  createPostComment,
  createCommunityPost,
  findUserByAuthId,
  listCommunityFeed,
  listPostComments
} from "../data/posts-repository";
import { serializeComment } from "./serialize-comment";
import { serializePost } from "./serialize-post";

const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

type AuthenticatedPostUser =
  | { ok: true; user: { legajo: number } }
  | { ok: false; status: number; error: { code: string; message: string } };

async function authenticatePostUser(request: Request): Promise<AuthenticatedPostUser> {
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

const postCreationSchema = z.object({
  id_comunidad: z.coerce.bigint().positive(),
  cuerpo: z.string().trim().min(1).max(5000)
});

const postIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^\d+$/, "El id del post debe ser numerico")
    .transform((id) => BigInt(id))
});

const commentCreationSchema = z.object({
  cuerpo: z.string().trim().min(1).max(2000),
  id_padre: z.preprocess(
    (value) => value === null || value === "" ? undefined : value,
    z.coerce.bigint().positive().optional()
  )
});

export function createPostsRouter(): Router {
  const router = Router();

  // ruta para obtener los post de una comunidad 
  router.get("/", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticatePostUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const posts = await listCommunityFeed(authenticatedUser.user.legajo);

      response.json({
        posts: posts.map(serializePost)
      });
    } catch (error) {
      next(error);
    }
  });

  // ruta para crear un nuevo post en una comunidad aceptada del usuario autenticado
  router.post("/", async (request, response, next) => {
    try {
      const authenticatedUser = await authenticatePostUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const parsedBody = postCreationSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid post payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const result = await createCommunityPost(
        authenticatedUser.user.legajo,
        parsedBody.data.id_comunidad,
        parsedBody.data.cuerpo
      );

      if (result.status === "community_not_found") {
        response.status(404).json({
          error: {
            code: "community_not_found",
            message: "Comunidad no encontrada o no aceptada"
          }
        });
        return;
      }

      if (result.status === "not_community_member") {
        response.status(403).json({
          error: {
            code: "not_community_member",
            message: "Debes unirte a la comunidad antes de publicar"
          }
        });
        return;
      }

      response.status(201).json({
        post: serializePost(result.post)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/comentarios", async (request, response, next) => {
    try {
      const parsedParams = postIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid post id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const authenticatedUser = await authenticatePostUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const result = await listPostComments(
        authenticatedUser.user.legajo,
        parsedParams.data.id
      );

      if (result.status === "post_not_found") {
        response.status(404).json({
          error: {
            code: "post_not_found",
            message: "Post no encontrado o su comunidad no esta aceptada"
          }
        });
        return;
      }

      if (result.status === "not_community_member") {
        response.status(403).json({
          error: {
            code: "not_community_member",
            message: "Debes pertenecer a la comunidad para ver sus comentarios"
          }
        });
        return;
      }

      response.json({
        comentarios: result.comentarios.map(serializeComment),
        total_comentarios: result.total_comentarios
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/comentarios", async (request, response, next) => {
    try {
      const parsedParams = postIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid post id",
            details: parsedParams.error.flatten().fieldErrors
          }
        });
        return;
      }

      const authenticatedUser = await authenticatePostUser(request);

      if (!authenticatedUser.ok) {
        response.status(authenticatedUser.status).json({
          error: authenticatedUser.error
        });
        return;
      }

      const parsedBody = commentCreationSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid comment payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const result = await createPostComment(
        authenticatedUser.user.legajo,
        parsedParams.data.id,
        parsedBody.data.cuerpo,
        parsedBody.data.id_padre
      );

      if (result.status === "post_not_found") {
        response.status(404).json({
          error: {
            code: "post_not_found",
            message: "Post no encontrado o su comunidad no esta aceptada"
          }
        });
        return;
      }

      if (result.status === "not_community_member") {
        response.status(403).json({
          error: {
            code: "not_community_member",
            message: "Debes pertenecer a la comunidad para comentar"
          }
        });
        return;
      }

      if (result.status === "invalid_parent") {
        response.status(400).json({
          error: {
            code: "invalid_parent_comment",
            message: "El comentario padre no existe o pertenece a otro post"
          }
        });
        return;
      }

      response.status(201).json({
        comentario: serializeComment(result.comentario),
        total_comentarios: result.total_comentarios
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
