import "dotenv/config";
import { z } from "zod";

const redisUrlSchema = z
  .string()
  .trim()
  .url("REDIS_URL must be a valid URL")
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "redis:" || protocol === "rediss:";
    } catch {
      return false;
    }
  }, "REDIS_URL must use redis:// or rediss://")
  .optional();

const optionalRedisUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  redisUrlSchema
);

const optionalSecretSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().min(32).optional()
);

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(3).optional()
);

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().optional(),
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_ANON_KEY: z.string().min(1),
    REDIS_URL: optionalRedisUrlSchema,
    RATE_LIMIT_KEY_SECRET: optionalSecretSchema,
    RESEND_API_KEY: z.string().trim().min(1).optional(),
    REGISTRATION_EMAIL_FROM: optionalEmailSchema,
    GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_LOCATION: z.string().default("us"),
    GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_CLASSIFIER_VERSION_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_EXTRACTOR_PROCESSOR_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_EXTRACTOR_VERSION_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_CERTIFICATE_CLASS: z.string().default("certificado_alumno_regular"),
    GOOGLE_DOCUMENT_AI_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.8),
    CERTIFICATE_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(15),
    REGISTRATION_EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().max(30).default(10),
    REGISTRATION_EMAIL_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(120).default(30),
    ALLOWED_EMAIL_DOMAINS: z.string().trim().min(1).default("uade.edu.ar"),
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional()
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && !environment.REDIS_URL) {
      context.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "REDIS_URL is required in production"
      });
    }

    if (environment.NODE_ENV === "production" && !environment.RATE_LIMIT_KEY_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["RATE_LIMIT_KEY_SECRET"],
        message: "RATE_LIMIT_KEY_SECRET is required in production"
      });
    }

    if (environment.NODE_ENV === "production" && !environment.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production"
      });
    }

    if (environment.NODE_ENV === "production" && !environment.REGISTRATION_EMAIL_FROM) {
      context.addIssue({
        code: "custom",
        path: ["REGISTRATION_EMAIL_FROM"],
        message: "REGISTRATION_EMAIL_FROM is required in production"
      });
    }
  });

export type EnvironmentConfig = z.infer<typeof environmentSchema> & {
  API_PORT: number;
};

export function parseEnvironment(source: NodeJS.ProcessEnv): EnvironmentConfig {
  const environment = environmentSchema.parse(source);

  return {
    ...environment,
    API_PORT: environment.PORT ?? environment.API_PORT
  };
}

export const config = parseEnvironment(process.env);
