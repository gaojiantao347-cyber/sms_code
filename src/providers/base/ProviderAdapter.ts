import type { SmsErrorType } from "../../domain/errors/SmsErrorType.js";

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorType: SmsErrorType; message: string };

export type ProviderBaseRequest = {
  providerId: string;
  providerSecret?: string;
  timeoutMs?: number;
};

export type AcquireNumberRequest = ProviderBaseRequest & {
  serviceCode?: string;
  countryCode?: string;
  operator?: string;
  maxPrice?: string;
};

export type AcquireNumberData = {
  phoneNumber: string;
  providerOrderId: string;
};

export type PollCodeRequest = ProviderBaseRequest & {
  providerOrderId: string;
};

export type PollCodeData = {
  smsCode: string | null;
};

export type CancelNumberRequest = ProviderBaseRequest & {
  providerOrderId: string;
};

export type CancelNumberData = {
  cancelled: boolean;
};

export type ProviderOptionRequest = ProviderBaseRequest;

export type ProviderCountryOption = {
  code: string;
  name: string;
};

export type ProviderServiceOption = {
  code: string;
  name: string;
};

export type ProviderPriceOption = {
  serviceCode: string;
  countryCode: string;
  price: string;
  currency: string | null;
  count: number | null;
  operator: string | null;
};

export type ProviderMappedError = {
  errorType: SmsErrorType;
  message: string;
};

export interface ProviderAdapter {
  readonly providerCode: string;

  acquireShortTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>>;

  acquireLongTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>>;

  pollCode(request: PollCodeRequest): Promise<ProviderResult<PollCodeData>>;

  cancelNumber(request: CancelNumberRequest): Promise<ProviderResult<CancelNumberData>>;

  listCountries?(request: ProviderOptionRequest): Promise<ProviderResult<ProviderCountryOption[]>>;

  listServices?(request: ProviderOptionRequest): Promise<ProviderResult<ProviderServiceOption[]>>;

  listPrices?(request: AcquireNumberRequest): Promise<ProviderResult<ProviderPriceOption[]>>;

  mapError(error: unknown): ProviderMappedError;
}
