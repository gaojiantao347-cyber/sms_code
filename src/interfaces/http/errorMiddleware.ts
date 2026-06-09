import type { NextFunction, Request, Response } from "express";
import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { logger } from "../../infrastructure/logger/logger.js";
import { errorResponse } from "../../shared/apiResponse.js";
import { getRequestId, type RequestWithId } from "./requestContext.js";

export function notFoundHandler(request: Request, response: Response): void {
  const requestId = getRequestId(request as RequestWithId);

  response.status(404).json(
    errorResponse(
      {
        type: SmsErrorType.TaskNotFound,
        message: "接口不存在"
      },
      requestId
    )
  );
}

export function errorMiddleware(error: unknown, request: Request, response: Response, _next: NextFunction): void {
  const requestId = getRequestId(request as RequestWithId);

  if (error instanceof SmsError) {
    response.status(error.statusCode).json(
      errorResponse(
        {
          type: error.type,
          message: error.message,
          details: error.details
        },
        requestId
      )
    );
    return;
  }

  logger.error("Unhandled request error", {
    requestId,
    error: error instanceof Error ? error.message : String(error)
  });

  response.status(500).json(
    errorResponse(
      {
        type: SmsErrorType.InternalError,
        message: "系统内部错误"
      },
      requestId
    )
  );
}
