import type { Request } from "express";

export type RequestWithId = Request & {
  requestId?: string;
};

export function getRequestId(request: RequestWithId): string {
  return request.requestId ?? "req_unknown";
}
