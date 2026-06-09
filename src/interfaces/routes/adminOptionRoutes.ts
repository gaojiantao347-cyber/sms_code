import { Router } from "express";
import type { AdminProviderOptionUseCase } from "../../application/admin/AdminProviderOptionUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createAdminOptionRoutes(adminProviderOptionUseCase: AdminProviderOptionUseCase): Router {
  const router = Router();

  router.get("/admin/options/providers/:providerId/services", async (request, response, next) => {
    try {
      const data = await adminProviderOptionUseCase.listServices(request.params.providerId);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/options/providers/:providerId/countries", async (request, response, next) => {
    try {
      const data = await adminProviderOptionUseCase.listCountries(request.params.providerId);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/options/providers/:providerId/prices", async (request, response, next) => {
    try {
      const data = await adminProviderOptionUseCase.listPrices(
        request.params.providerId,
        readQueryString(request.query.serviceCode),
        readQueryString(request.query.countryCode)
      );
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function readQueryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
