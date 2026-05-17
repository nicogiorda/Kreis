import { Router } from "express";
import { createModulePlaceholder } from "../../../shared/module-placeholder";

export function createDiscoveryRouter(): Router {
  const router = Router();

  router.get("/", (_request, response) => {
    response.status(501).json(createModulePlaceholder("discovery"));
  });

  return router;
}
