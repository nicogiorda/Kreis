import multer from "multer";
import rateLimit from "express-rate-limit";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import { config } from "../../../core/config";
import { IssueCertificateVerificationUseCase } from "../application/issue-certificate-verification";
import { LoginUseCase } from "../application/login";
import { RefreshSessionUseCase } from "../application/refresh-session";
import { RegisterUseCase } from "../application/register";
import {
  AuthProviderError,
  CertificateVerificationError,
  EmailConfirmationNotEnabledError,
  ProfileCreationError,
  RegistrationEmailDomainError,
  RegistrationFinalizationError,
  RegistrationRollbackError
} from "../domain/auth-errors";
import {
  isAllowedRegistrationEmail,
  parseAllowedEmailDomains
} from "../domain/registration-email";
import {
  CertificateClassifierConfigError,
  CertificateClassifierRequestError,
  processCertificatePdf
} from "../infrastructure/document-ai-certificate-classifier";
import { resolveCertificateFaculty } from "../infrastructure/certificate-faculty-resolver";
import { PrismaCertificateVerificationRepository } from "../infrastructure/prisma-certificate-verification-repository";
import { PrismaUserRepository } from "../infrastructure/prisma-user-repository";
import { SupabaseAuthProvider } from "../infrastructure/supabase-auth-provider";
import { createPendingEmailVerificationResponse } from "./register-response";

const certificateFieldName = "certificate";
const maxCertificateSizeBytes = 5 * 1024 * 1024;
const emailDomainErrorMessage = "El correo debe pertenecer a una universidad habilitada.";
const allowedRegistrationEmailDomains = parseAllowedEmailDomains(
  config.ALLOWED_EMAIL_DOMAINS
);

const registrationEmailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase())
  .refine(
    (email) => isAllowedRegistrationEmail(email, allowedRegistrationEmailDomains),
    emailDomainErrorMessage
  );

const certificateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "certificate_rate_limited",
      message: "Demasiados intentos de validacion de certificado. Intenta nuevamente en unos minutos."
    }
  }
});

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

const refreshRequestSchema = z.object({
  refresh_token: z.string().min(1)
});

const registerRequestSchema = z.object({
  email: registrationEmailSchema,
  password: z.string().min(8),
  legajo: z.coerce.number().int().positive(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  topicos: z.array(z.coerce.number().int().positive()).default([]),
  certificate_verification_token: z.string().min(1)
});

const certificateValidationRequestSchema = z.object({
  email: registrationEmailSchema,
  legajo: z.coerce.number().int().positive(),
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1)
});

const authProvider = new SupabaseAuthProvider();
const userRepository = new PrismaUserRepository();
const certificateVerificationRepository = new PrismaCertificateVerificationRepository();
const issueCertificateVerificationUseCase = new IssueCertificateVerificationUseCase(
  certificateVerificationRepository,
  config.CERTIFICATE_VERIFICATION_TTL_MINUTES,
  { allowedEmailDomains: allowedRegistrationEmailDomains }
);
const registerUseCase = new RegisterUseCase(
  authProvider,
  userRepository,
  certificateVerificationRepository,
  { allowedEmailDomains: allowedRegistrationEmailDomains }
);
const loginUseCase = new LoginUseCase(authProvider);
const refreshSessionUseCase = new RefreshSessionUseCase(authProvider);

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

  router.post("/certificate/classify", certificateRateLimit, uploadCertificate, async (request, response, next) => {
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

      const parsedBody = certificateValidationRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        const invalidEmailDomain = parsedBody.error.issues.some(
          (issue) => issue.path[0] === "email" && issue.message === emailDomainErrorMessage
        );

        response.status(400).json({
          error: {
            code: invalidEmailDomain ? "invalid_email_domain" : "validation_error",
            message: invalidEmailDomain
              ? emailDomainErrorMessage
              : "Invalid certificate validation payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const certificate = await processCertificatePdf(request.file.buffer, parsedBody.data);
      const resolvedFaculty = certificate.valid
        ? await resolveCertificateFaculty(certificate.validation?.facultyName ?? certificate.extraction?.facultyName)
        : null;
      const certificateResponse = certificate.valid && !resolvedFaculty && certificate.validation
        ? {
            ...certificate,
            valid: false,
            validation: {
              ...certificate.validation,
              valid: false,
              errors: [
                ...certificate.validation.errors,
                "No pudimos asociar la facultad del certificado con una facultad valida."
              ]
            }
          }
        : certificate;
      const verification = await issueCertificateVerificationUseCase.execute(
        certificateResponse.valid,
        parsedBody.data,
        resolvedFaculty ? { idFacultad: resolvedFaculty.id_facultad } : null
      );

      response.json({
        certificate: certificateResponse,
        ...(resolvedFaculty ? { faculty: resolvedFaculty } : {}),
        ...(verification ? { verification } : {})
      });
    } catch (error) {
      if (error instanceof RegistrationEmailDomainError) {
        response.status(400).json({
          error: { code: error.code, message: error.message }
        });
        return;
      }

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
      if (
        typeof request.body?.certificate_verification_token !== "string" ||
        request.body.certificate_verification_token.length === 0
      ) {
        response.status(400).json({
          error: {
            code: "certificate_verification_required",
            message: "La validacion del certificado es obligatoria."
          }
        });
        return;
      }

      const parsedBody = registerRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        const invalidEmailDomain = parsedBody.error.issues.some(
          (issue) => issue.path[0] === "email" && issue.message === emailDomainErrorMessage
        );

        response.status(400).json({
          error: {
            code: invalidEmailDomain ? "invalid_email_domain" : "validation_error",
            message: invalidEmailDomain
              ? emailDomainErrorMessage
              : "Invalid register payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const user = await registerUseCase.execute(parsedBody.data);

      response.status(201).json(
        createPendingEmailVerificationResponse(user.email)
      );
    } catch (error) {
      if (error instanceof CertificateVerificationError) {
        const status =
          error.code === "certificate_verification_expired"
            ? 410
            : error.code === "certificate_verification_used"
              ? 409
              : 400;

        response.status(status).json({
          error: { code: error.code, message: error.message }
        });
        return;
      }

      if (error instanceof RegistrationEmailDomainError) {
        response.status(400).json({
          error: { code: error.code, message: error.message }
        });
        return;
      }

      if (error instanceof EmailConfirmationNotEnabledError) {
        response.status(503).json({
          error: { code: error.code, message: error.message }
        });
        return;
      }

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

      if (
        error instanceof RegistrationFinalizationError ||
        error instanceof RegistrationRollbackError
      ) {
        response.status(500).json({
          error: {
            code: "registration_finalization_failed",
            message: "No pudimos completar el registro. Intenta nuevamente."
          }
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

  router.post("/refresh", async (request, response, next) => {
    try {
      const parsedBody = refreshRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        response.status(400).json({
          error: {
            code: "validation_error",
            message: "Invalid refresh payload",
            details: parsedBody.error.flatten().fieldErrors
          }
        });
        return;
      }

      const session = await refreshSessionUseCase.execute(parsedBody.data.refresh_token);

      response.json(session);
    } catch (error) {
      if (error instanceof AuthProviderError) {
        response.status(401).json({
          error: { code: "invalid_refresh_token", message: error.message }
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
