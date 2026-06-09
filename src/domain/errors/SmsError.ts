import type { SmsErrorType } from "./SmsErrorType.js";

export class SmsError extends Error {
  constructor(
    public readonly type: SmsErrorType,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SmsError";
  }
}
