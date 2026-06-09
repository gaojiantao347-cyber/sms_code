import type { SmsErrorType } from "../domain/errors/SmsErrorType.js";

export type ApiError = {
  type: SmsErrorType;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: ApiError; requestId: string };

export function successResponse<T>(data: T, requestId: string): ApiResponse<T> {
  return { success: true, data, requestId };
}

export function errorResponse(error: ApiError, requestId: string): ApiResponse<never> {
  return { success: false, error, requestId };
}
