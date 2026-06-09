import { randomUUID } from "node:crypto";
import type { NextFunction, Response } from "express";
import type { RequestWithId } from "./requestContext.js";

export function requestIdMiddleware(request: RequestWithId, response: Response, next: NextFunction): void {
  const incomingRequestId = request.header("x-request-id");
  const requestId = incomingRequestId?.trim() || `req_${randomUUID()}`;

  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
}
