import type { SmsErrorType } from "./error";

export type ApiError = {
  type: SmsErrorType;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: ApiError; requestId: string };

export class ApiClientError extends Error {
  readonly type: SmsErrorType;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(error: ApiError, requestId?: string) {
    super(error.message);
    this.name = "ApiClientError";
    this.type = error.type;
    this.requestId = requestId;
    this.details = error.details;
  }
}
