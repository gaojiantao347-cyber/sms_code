import type { NextFunction, Request, Response } from "express";
import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";

export function createAdminAuthMiddleware(adminToken: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const token = readBearerToken(request.headers.authorization) ?? readHeaderToken(request.headers["x-admin-token"]);

    if (!adminToken || token !== adminToken) {
      next(new SmsError(SmsErrorType.Unauthorized, "后台访问未授权", 401));
      return;
    }

    next();
  };
}

function readBearerToken(value: string | undefined): string | undefined {
  if (!value?.startsWith("Bearer ")) {
    return undefined;
  }

  return value.slice("Bearer ".length).trim() || undefined;
}

function readHeaderToken(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}
