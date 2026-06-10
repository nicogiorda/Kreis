import multer from "multer";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import { LoginUseCase } from "../application/login";
import { RegisterUseCase } from "../application/register";
import { AuthProviderError, ProfileCreationError } from "../domain/auth-errors";
import {
  CertificateClassifierConfigError,
  CertificateClassifierRequestError,
  classifyCertificatePdf
} from "../infrastructure/document-ai-certificate-classifier";
import { PrismaUserRepository } from "../infrastructure/prisma-user-repository";
import { SupabaseAuthProvider } from "../infrastructure/supabase-auth-provider";

const certificateFieldName = "certificate";
const maxCertificateSizeBytes = 5 * 1024 * 1024;

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxCertificateSizeBytes,
    files: 1
  },
  fileFilter(_request, file, callback) {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("El certificado debe ser un PDF."));
      return;
    }

    callback(null, true);
  }
});

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
  id_facultad: z.coerce.number().int().positive(),
  topicos: z.array(z.coerce.number().int().positive()).default([])
});

const authProvider = new SupabaseAuthProvider();
const userRepository = new PrismaUserRepository();
const registerUseCase = new RegisterUseCase(authProvider, userRepository);
const loginUseCase = new LoginUseCase(authProvider);

function uploadCertificate(request: Request, response: Response, next: NextFunction): void {
  certificateUpload.single(certificateFieldName)(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        error: {
          code: "certificate_too_large",
          message: "El certificado no puede superar los 5 MB."
        }
      });
      return;
    }

    response.status(400).json({
      error: {
        code: "invalid_certificate_file",
        message: error instanceof Error ? error.message : "Certificado invalido."
      }
    });
  });
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/certificate/classify", uploadCertificate, async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({
          error: {
            code: "missing_certificate",
            message: `El archivo debe enviarse en el campo ${certificateFieldName}.`
          }
        });
        return;
      }

      const classification = await classifyCertificatePdf(request.file.buffer);

      response.json({ certificate: classification });
    } catch (error) {
      if (error instanceof CertificateClassifierConfigError) {
        response.status(500).json({
          error: {
            code: "document_ai_config_error",
            message: error.message
          }
        });
        return;
      }

      if (error instanceof CertificateClassifierRequestError) {
        response.status(502).json({
          error: {
            code: "document_ai_request_failed",
            message: "No pudimos validar el certificado en este momento."
          }
        });
        return;
      }

      next(error);
    }
  });

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
      if (error instanceof AuthProviderError) {
        response.status(400).json({
          error: { code: "register_failed", message: error.message }
        });
        return;
      }

      if (error instanceof ProfileCreationError) {
        response.status(500).json({
          error: { code: "profile_creation_failed", message: error.message }
        });
        return;
      }

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

      const session = await loginUseCase.execute(parsedBody.data);

      response.json(session);
    } catch (error) {
      if (error instanceof AuthProviderError) {
        response.status(401).json({
          error: { code: "invalid_credentials", message: error.message }
        });
        return;
      }

      next(error);
    }
  });

  router.post("/logout", (_request, response) => {
    response.status(204).send();
  });

  return router;
}
