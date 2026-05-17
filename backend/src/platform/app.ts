import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "../core/config";
import { sendError, sendNotFound } from "../core/http";
import { registerRoutes } from "./routes";

export function createApp(): express.Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  registerRoutes(app);

  app.use(sendNotFound);
  app.use(sendError);

  return app;
}
