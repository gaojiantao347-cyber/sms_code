import { Router } from "express";
import type { AdminCatalogUseCase } from "../../application/admin/AdminCatalogUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createAdminCatalogRoutes(adminCatalogUseCase: AdminCatalogUseCase): Router {
  const router = Router();

  router.get("/admin/catalog/platforms", (request, response, next) => {
    try {
      const data = adminCatalogUseCase.listPlatforms(parseBoolean(request.query.enabledOnly));
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/catalog/countries", (request, response, next) => {
    try {
      const data = adminCatalogUseCase.listCountries(parseBoolean(request.query.enabledOnly));
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/catalog/sync", async (request, response, next) => {
    try {
      const data = await adminCatalogUseCase.sync(readString(request.body?.providerId));
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseBoolean(value: unknown): boolean {
  return value === "true";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
