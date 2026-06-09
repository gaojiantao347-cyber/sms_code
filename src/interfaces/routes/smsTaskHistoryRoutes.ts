import { Router } from "express";
import { SmsMode } from "../../domain/sms-task/SmsMode.js";
import { SmsTaskStatus } from "../../domain/sms-task/SmsTaskStatus.js";
import type { SmsTaskHistoryUseCase } from "../../application/sms-task/SmsTaskHistoryUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createSmsTaskHistoryRoutes(smsTaskHistoryUseCase: SmsTaskHistoryUseCase): Router {
  const router = Router();

  router.get("/sms-task-history", (request, response, next) => {
    try {
      const data = smsTaskHistoryUseCase.listHistory({
        redeemCodeKeyword: asOptionalString(request.query.redeemCodeKeyword),
        platformCode: asOptionalString(request.query.platformCode),
        smsMode: parseSmsMode(request.query.smsMode),
        status: parseSmsTaskStatus(request.query.status),
        page: parseOptionalInteger(request.query.page),
        pageSize: parseOptionalInteger(request.query.pageSize)
      });
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sms-task-history/:taskId", (request, response, next) => {
    try {
      const data = smsTaskHistoryUseCase.getHistoryDetail(request.params.taskId);
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

function parseSmsMode(value: unknown) {
  return Object.values(SmsMode).includes(value as SmsMode) ? (value as SmsMode) : undefined;
}

function parseSmsTaskStatus(value: unknown) {
  return Object.values(SmsTaskStatus).includes(value as SmsTaskStatus) ? (value as SmsTaskStatus) : undefined;
}
