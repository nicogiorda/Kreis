import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_DOCUMENT_AI_LOCATION: z.string().default("us"),
  GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID: z.string().optional(),
  GOOGLE_DOCUMENT_AI_CLASSIFIER_VERSION_ID: z.string().optional(),
  GOOGLE_DOCUMENT_AI_EXTRACTOR_PROCESSOR_ID: z.string().optional(),
  GOOGLE_DOCUMENT_AI_EXTRACTOR_VERSION_ID: z.string().optional(),
  GOOGLE_DOCUMENT_AI_CERTIFICATE_CLASS: z.string().default("certificado_alumno_regular"),
  GOOGLE_DOCUMENT_AI_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.8),
  CERTIFICATE_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(15),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional()
});

const environment = environmentSchema.parse(process.env);

export const config = {
  ...environment,
  API_PORT: environment.PORT ?? environment.API_PORT
};
