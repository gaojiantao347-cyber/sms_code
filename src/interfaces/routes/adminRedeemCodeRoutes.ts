import { Router } from "express";
import { SmsMode } from "../../domain/sms-task/SmsMode.js";
import type { AdminRedeemCodeUseCase } from "../../application/admin/AdminRedeemCodeUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createAdminRedeemCodeRoutes(adminRedeemCodeUseCase: AdminRedeemCodeUseCase): Router {
  const router = Router();

  router.get("/admin/redeem-codes", (request, response, next) => {
    try {
      const data = adminRedeemCodeUseCase.list({
        codeKeyword: asOptionalString(request.query.codeKeyword),
        platformCode: asOptionalString(request.query.platformCode),
        smsMode: parseSmsMode(request.query.smsMode),
        enabled: parseBoolean(request.query.enabled),
        page: parseOptionalInteger(request.query.page),
        pageSize: parseOptionalInteger(request.query.pageSize)
      });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/redeem-codes", (request, response, next) => {
    try {
      const data = adminRedeemCodeUseCase.create({
        enabled: typeof request.body?.enabled === "boolean" ? request.body.enabled : undefined,
        platformCode: readString(request.body?.platformCode),
        platformName: readString(request.body?.platformName),
        smsMode: request.body?.smsMode,
        providerId: readString(request.body?.providerId),
        serviceCode: readNullableString(request.body?.serviceCode),
        countryCode: readNullableString(request.body?.countryCode),
        operator: readNullableString(request.body?.operator),
        maxPrice: readNullableString(request.body?.maxPrice),
        maxUseCount: Number(request.body?.maxUseCount),
        expiresAt: readNullableString(request.body?.expiresAt)
      });
      response.status(201).json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/admin/redeem-codes/:id", (request, response, next) => {
    try {
      const data = adminRedeemCodeUseCase.update(request.params.id, {
        enabled: typeof request.body?.enabled === "boolean" ? request.body.enabled : undefined,
        platformCode: readOptionalString(request.body?.platformCode),
        platformName: readOptionalString(request.body?.platformName),
        smsMode: request.body?.smsMode,
        providerId: readOptionalString(request.body?.providerId),
        serviceCode: readOptionalNullableString(request.body?.serviceCode),
        countryCode: readOptionalNullableString(request.body?.countryCode),
        operator: readOptionalNullableString(request.body?.operator),
        maxPrice: readOptionalNullableString(request.body?.maxPrice),
        maxUseCount: request.body?.maxUseCount === undefined ? undefined : Number(request.body.maxUseCount),
        expiresAt: readOptionalNullableString(request.body?.expiresAt)
      });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/redeem-codes/:id/disable", (request, response, next) => {
    try {
      const data = adminRedeemCodeUseCase.disable(request.params.id);
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

function parseSmsMode(value: unknown): SmsMode | undefined {
  return Object.values(SmsMode).includes(value as SmsMode) ? (value as SmsMode) : undefined;
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
