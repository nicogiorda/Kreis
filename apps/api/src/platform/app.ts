import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "../core/config";
import { sendError, sendNotFound } from "../core/http";
import { registerRoutes } from "./routes";

function getAllowedOrigins(): string[] {
  const configuredOrigins = config.CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (config.NODE_ENV === "production") return configuredOrigins;

  return Array.from(new Set([
    ...configuredOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]));
}

export function createApp(): express.Application {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  }));
  app.use(express.json({ limit: "1mb" }));

  registerRoutes(app);

  app.use(sendNotFound);
  app.use(sendError);

  return app;
}
