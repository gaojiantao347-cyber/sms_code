import { Router } from "express";
import { ProviderCapability } from "../../domain/provider/ProviderCapability.js";
import type { AdminProviderCapabilityInput, AdminProviderUseCase } from "../../application/admin/AdminProviderUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createAdminProviderRoutes(adminProviderUseCase: AdminProviderUseCase): Router {
  const router = Router();

  router.get("/admin/providers/adapter-options", (request, response, next) => {
    try {
      const data = adminProviderUseCase.listAdapterOptions();
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/providers", (request, response, next) => {
    try {
      const data = adminProviderUseCase.list({
        nameKeyword: asOptionalString(request.query.nameKeyword),
        enabled: parseBoolean(request.query.enabled),
        page: parseOptionalInteger(request.query.page),
        pageSize: parseOptionalInteger(request.query.pageSize)
      });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/providers", (request, response, next) => {
    try {
      const data = adminProviderUseCase.create({
        name: readString(request.body?.name),
        enabled: typeof request.body?.enabled === "boolean" ? request.body.enabled : undefined,
        secret: readNullableString(request.body?.secret),
        capabilities: parseCapabilities(request.body?.capabilities)
      });
      response.status(201).json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/admin/providers/:id", (request, response, next) => {
    try {
      const data = adminProviderUseCase.update(request.params.id, {
        name: readOptionalString(request.body?.name),
        enabled: typeof request.body?.enabled === "boolean" ? request.body.enabled : undefined,
        secret: readOptionalNullableString(request.body?.secret),
        capabilities: request.body?.capabilities === undefined ? undefined : parseCapabilities(request.body.capabilities)
      });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/providers/:id/disable", (request, response, next) => {
    try {
      const data = adminProviderUseCase.disable(request.params.id);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseOptionalInteger(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function parseCapabilities(value: unknown): AdminProviderCapabilityInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    capabilityCode: item?.capabilityCode as ProviderCapability,
    enabled: item?.enabled === true
  }));
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readOptionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === "string" ? value : null;
}
