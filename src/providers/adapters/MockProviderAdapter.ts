import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import type {
  AcquireNumberData,
  AcquireNumberRequest,
  CancelNumberData,
  CancelNumberRequest,
  PollCodeData,
  PollCodeRequest,
  ProviderAdapter,
  ProviderMappedError,
  ProviderResult
} from "../base/ProviderAdapter.js";
import { mapProviderTimeout, providerErrorResult, withProviderTimeout } from "../base/withProviderTimeout.js";

const DEFAULT_TIMEOUT_MS = 3_000;
const MOCK_SMS_CODE = "123456";

type MockOrder = {
  phoneNumber: string;
  cancelled: boolean;
  pollCount: number;
};

export class MockProviderAdapter implements ProviderAdapter {
  readonly providerCode = "mock";

  private readonly orders = new Map<string, MockOrder>();

  async acquireShortTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => this.createOrder("short"));
  }

  async acquireLongTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => this.createOrder("long"));
  }

  async pollCode(request: PollCodeRequest): Promise<ProviderResult<PollCodeData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const order = this.orders.get(request.providerOrderId);
      if (!order || order.cancelled) {
        throw new MockProviderError(SmsErrorType.AcquireNumberFailed, "Provider order is not active");
      }

      order.pollCount += 1;
      return { smsCode: order.pollCount >= 2 ? MOCK_SMS_CODE : null };
    });
  }

  async cancelNumber(request: CancelNumberRequest): Promise<ProviderResult<CancelNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const order = this.orders.get(request.providerOrderId);
      if (order) {
        order.cancelled = true;
      }

      return { cancelled: true };
    });
  }

  mapError(error: unknown): ProviderMappedError {
    const timeoutError = mapProviderTimeout(error);
    if (timeoutError) {
      return timeoutError;
    }

    if (error instanceof MockProviderError) {
      return {
        errorType: error.errorType,
        message: error.publicMessage
      };
    }

    return {
      errorType: SmsErrorType.ProviderUnavailable,
      message: "Provider request failed"
    };
  }

  private async runWithBoundary<T>(timeoutMs: number | undefined, operation: () => Promise<T>): Promise<ProviderResult<T>> {
    try {
      const data = await withProviderTimeout(operation(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
      return { ok: true, data };
    } catch (error) {
      return providerErrorResult(this.mapError(error));
    }
  }

  private createOrder(kind: "short" | "long"): AcquireNumberData {
    const providerOrderId = `mock_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const phoneNumber = kind === "short" ? "13800000001" : "13800000002";

    this.orders.set(providerOrderId, {
      phoneNumber,
      cancelled: false,
      pollCount: 0
    });

    return {
      phoneNumber,
      providerOrderId
    };
  }
}

class MockProviderError extends Error {
  constructor(
    readonly errorType: SmsErrorType,
    readonly publicMessage: string
  ) {
    super(publicMessage);
    this.name = "MockProviderError";
  }
}
