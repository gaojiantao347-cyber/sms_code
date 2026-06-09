import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import type { ProviderMappedError, ProviderResult } from "./ProviderAdapter.js";

export class ProviderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Provider request timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}

export async function withProviderTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new ProviderTimeoutError(timeoutMs)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function providerErrorResult<T>(mappedError: ProviderMappedError): ProviderResult<T> {
  return {
    ok: false,
    errorType: mappedError.errorType,
    message: mappedError.message
  };
}

export function mapProviderTimeout(error: unknown): ProviderMappedError | undefined {
  if (error instanceof ProviderTimeoutError) {
    return {
      errorType: SmsErrorType.ProviderUnavailable,
      message: "Provider request timed out"
    };
  }

  return undefined;
}
