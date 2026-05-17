import type { Application, Request, Response } from "express";
import { createAuthRouter } from "../modules/auth/api/routes";
import { createCommunitiesRouter } from "../modules/communities/api/routes";
import { createDiscoveryRouter } from "../modules/discovery/api/routes";
import { createEventsRouter } from "../modules/events/api/routes";
import { createNotificationsRouter } from "../modules/notifications/api/routes";
import { createPostsRouter } from "../modules/posts/api/routes";
import { createUsersRouter } from "../modules/users/api/routes";

export function registerRoutes(app: Application): void {
  app.get("/health", (_request: Request, response: Response) => {
    response.json({
      status: "ok",
      service: "kreis-api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/users", createUsersRouter());
  app.use("/api/v1/events", createEventsRouter());
  app.use("/api/v1/communities", createCommunitiesRouter());
  app.use("/api/v1/posts", createPostsRouter());
  app.use("/api/v1/discovery", createDiscoveryRouter());
  app.use("/api/v1/notifications", createNotificationsRouter());
}
