import { Router } from "express";
import { createModulePlaceholder } from "../../../shared/module-placeholder";

export function createAuthRouter(): Router {
  const router = Router();

  router.get("/", (_request, response) => {
    response.status(501).json(createModulePlaceholder("auth"));
  });

  return router;
}
