import { Router } from "express";
import type { SmsTaskUseCase } from "../../application/sms-task/SmsTaskUseCase.js";
import { successResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "../http/requestContext.js";

export function createSmsTaskRoutes(smsTaskUseCase: SmsTaskUseCase): Router {
  const router = Router();

  router.get("/sms-tasks/:taskId", (request, response, next) => {
    try {
      const data = smsTaskUseCase.getTask(request.params.taskId);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/sms-tasks/:taskId/wait-code", (request, response, next) => {
    try {
      const data = smsTaskUseCase.waitCode(request.params.taskId);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/sms-tasks/:taskId/cancel", (request, response, next) => {
    try {
      const reason = typeof request.body?.reason === "string" ? request.body.reason : undefined;
      const data = smsTaskUseCase.cancel(request.params.taskId, reason);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/sms-tasks/:taskId/complete", (request, response, next) => {
    try {
      const data = smsTaskUseCase.complete(request.params.taskId);
      response.json(successResponse(data, getRequestId(request as RequestWithId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
