import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import type {
  AcquireNumberData,
  AcquireNumberRequest,
  CancelNumberData,
  CancelNumberRequest,
  PollCodeData,
  PollCodeRequest,
  ProviderAdapter,
  ProviderCountryOption,
  ProviderMappedError,
  ProviderPriceOption,
  ProviderResult,
  ProviderServiceOption
} from "../base/ProviderAdapter.js";
import { mapProviderTimeout, providerErrorResult, withProviderTimeout } from "../base/withProviderTimeout.js";

const BASE_URL = "https://hero-sms.com/stubs/handler_api.php";
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_RENT_DURATION_HOURS = "24";

export class HeroSmsProviderAdapter implements ProviderAdapter {
  readonly providerCode = "hero-sms";

  async acquireShortTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const text = await this.requestText(this.withPriceParams({
        action: "getNumber",
        api_key: this.requireApiKey(request.providerSecret),
        service: this.requireText(request.serviceCode, "Hero SMS serviceCode 不能为空"),
        country: this.requireText(request.countryCode, "Hero SMS countryCode 不能为空")
      }, request));

      return this.parseNumberResponse(text);
    });
  }

  async acquireLongTermNumber(request: AcquireNumberRequest): Promise<ProviderResult<AcquireNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const text = await this.requestText(this.withPriceParams({
        action: "getRentNumber",
        api_key: this.requireApiKey(request.providerSecret),
        service: this.requireText(request.serviceCode, "Hero SMS serviceCode 不能为空"),
        country: this.requireText(request.countryCode, "Hero SMS countryCode 不能为空"),
        duration: DEFAULT_RENT_DURATION_HOURS
      }, request));

      return this.parseRentNumberResponse(text);
    });
  }

  async pollCode(request: PollCodeRequest): Promise<ProviderResult<PollCodeData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const text = await this.requestText({
        action: "getStatus",
        api_key: this.requireApiKey(request.providerSecret),
        id: request.providerOrderId
      });

      return this.parseStatusResponse(text);
    });
  }

  async cancelNumber(request: CancelNumberRequest): Promise<ProviderResult<CancelNumberData>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      await this.requestText({
        action: "cancelActivation",
        api_key: this.requireApiKey(request.providerSecret),
        id: request.providerOrderId
      });

      return { cancelled: true };
    });
  }

  async listCountries(request: AcquireNumberRequest): Promise<ProviderResult<ProviderCountryOption[]>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const text = await this.requestText({
        action: "getCountries",
        api_key: this.requireApiKey(request.providerSecret)
      });

      return this.parseCountriesResponse(text);
    });
  }

  async listServices(request: AcquireNumberRequest): Promise<ProviderResult<ProviderServiceOption[]>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const text = await this.requestText({
        action: "getServicesList",
        api_key: this.requireApiKey(request.providerSecret)
      });

      return this.parseServicesResponse(text);
    });
  }

  async listPrices(request: AcquireNumberRequest): Promise<ProviderResult<ProviderPriceOption[]>> {
    return this.runWithBoundary(request.timeoutMs, async () => {
      const serviceCode = this.requireText(request.serviceCode, "Hero SMS serviceCode 不能为空");
      const countryCode = this.requireText(request.countryCode, "Hero SMS countryCode 不能为空");
      const text = await this.requestText({
        action: "getPrices",
        api_key: this.requireApiKey(request.providerSecret),
        service: serviceCode,
        country: countryCode
      });

      return this.parsePricesResponse(text, serviceCode, countryCode);
    });
  }

  mapError(error: unknown): ProviderMappedError {
    const timeoutError = mapProviderTimeout(error);
    if (timeoutError) {
      return timeoutError;
    }

    if (error instanceof HeroSmsProviderError) {
      return {
        errorType: error.errorType,
        message: error.publicMessage
      };
    }

    return {
      errorType: SmsErrorType.ProviderUnavailable,
      message: "Hero SMS request failed"
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

  private withPriceParams(params: Record<string, string>, request: AcquireNumberRequest): Record<string, string> {
    return {
      ...params,
      ...(request.operator ? { operator: request.operator } : {}),
      ...(request.maxPrice ? { maxPrice: request.maxPrice } : {})
    };
  }

  private async requestText(params: Record<string, string>): Promise<string> {
    const url = new URL(BASE_URL);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);
    const text = await response.text();
    if (response.ok || response.status === 204) {
      return text.trim();
    }

    throw this.toProviderError(response.status, text.trim());
  }

  private parseNumberResponse(text: string): AcquireNumberData {
    const match = /^ACCESS_NUMBER:([^:]+):(.+)$/.exec(text);
    if (!match) {
      throw this.toProviderError(undefined, text);
    }

    return {
      providerOrderId: match[1],
      phoneNumber: match[2]
    };
  }

  private parseRentNumberResponse(text: string): AcquireNumberData {
    const data = this.parseJson(text);
    const record = this.requireRecord(data, text);
    const providerOrderId = this.readStringField(record, ["activationId"]);
    const phoneNumber = this.readStringField(record, ["phoneNumber"]);
    if (!providerOrderId || !phoneNumber) {
      throw this.toProviderError(undefined, text);
    }

    return {
      providerOrderId,
      phoneNumber
    };
  }

  private parseStatusResponse(text: string): PollCodeData {
    if (text === "STATUS_WAIT_CODE" || text === "STATUS_WAIT_RETRY" || text === "STATUS_WAIT_RESEND" || text === "ACCESS_RETRY_GET") {
      return { smsCode: null };
    }

    const match = /^STATUS_OK:(.+)$/.exec(text);
    if (match) {
      return { smsCode: match[1] };
    }

    throw this.toProviderError(undefined, text);
  }

  private parseCountriesResponse(text: string): ProviderCountryOption[] {
    const data = this.parseJson(text);
    const countries = Array.isArray(data) ? data : Object.values(this.requireRecord(data, text));

    return countries
      .map((item) => ({
        code: this.readStringField(item, ["id"]),
        name: this.readStringField(item, ["chn", "eng", "rus"])
      }))
      .filter((item): item is ProviderCountryOption => Boolean(item.code && item.name));
  }

  private parseServicesResponse(text: string): ProviderServiceOption[] {
    const data = this.requireRecord(this.parseJson(text), text);
    if (this.readStringField(data, ["status"]) !== "success" || !Array.isArray(data.services)) {
      throw this.toProviderError(undefined, text);
    }

    return data.services
      .map((item) => ({
        code: this.readStringField(item, ["code"]),
        name: this.readStringField(item, ["name"])
      }))
      .filter((item): item is ProviderServiceOption => Boolean(item.code && item.name));
  }

  private parsePricesResponse(text: string, serviceCode: string, countryCode: string): ProviderPriceOption[] {
    const data = this.parseJson(text);
    const priceRecords = this.collectPriceRecords(data, serviceCode, countryCode);

    return priceRecords.map((record) => this.makePriceOption(serviceCode, countryCode, this.requirePrice(record, text), record));
  }

  private collectPriceRecords(value: unknown, serviceCode: string, countryCode: string): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectPriceRecords(item, serviceCode, countryCode));
    }

    const record = this.asRecord(value);
    if (!record) {
      return [];
    }

    if (this.isMatchingPriceRecord(record, serviceCode, countryCode)) {
      return [record];
    }

    const dataValue = record.data;
    if (dataValue !== undefined) {
      return this.collectPriceRecords(dataValue, serviceCode, countryCode);
    }

    const countryNode = this.asRecord(record[countryCode]);
    const serviceInCountry = countryNode ? this.asRecord(countryNode[serviceCode]) : null;
    if (serviceInCountry) {
      return this.collectPriceRecords(serviceInCountry, serviceCode, countryCode);
    }

    const serviceNode = this.asRecord(record[serviceCode]);
    const countryInService = serviceNode ? this.asRecord(serviceNode[countryCode]) : null;
    if (countryInService) {
      return this.collectPriceRecords(countryInService, serviceCode, countryCode);
    }

    return Object.values(record).flatMap((item) => this.collectPriceRecords(item, serviceCode, countryCode));
  }

  private isMatchingPriceRecord(record: Record<string, unknown>, serviceCode: string, countryCode: string): boolean {
    const price = this.readStringField(record, ["cost", "price", "rate"]);
    if (!price) {
      return false;
    }

    const recordServiceCode = this.readStringField(record, ["service", "serviceCode"]);
    const recordCountryCode = this.readStringField(record, ["country", "countryCode"]);
    return (!recordServiceCode || recordServiceCode === serviceCode) && (!recordCountryCode || recordCountryCode === countryCode);
  }

  private toPriceOption(item: unknown): ProviderPriceOption | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const value = record.value ?? item;
    const priceRecord = this.asRecord(value);
    const price = priceRecord ? this.readStringField(priceRecord, ["cost", "price", "rate"]) : undefined;
    if (!price) {
      return null;
    }

    const serviceCode = this.readStringField(record, ["service", "serviceCode"]);
    const countryCode = this.readStringField(record, ["country", "countryCode"]);
    if (serviceCode && countryCode) {
      return this.makePriceOption(serviceCode, countryCode, price, priceRecord);
    }

    const firstKey = this.readStringField(record, ["firstKey"]);
    const secondKey = this.readStringField(record, ["secondKey"]);
    if (!firstKey || !secondKey) {
      return null;
    }

    const countryFirst = /^\d+$/.test(firstKey) && !/^\d+$/.test(secondKey);
    const serviceFirst = !/^\d+$/.test(firstKey) && /^\d+$/.test(secondKey);
    return this.makePriceOption(
      serviceFirst ? firstKey : secondKey,
      countryFirst ? firstKey : secondKey,
      price,
      priceRecord
    );
  }

  private requirePrice(value: unknown, body: string): string {
    const price = this.readStringField(value, ["cost", "price", "rate"]);
    if (!price) {
      throw this.toProviderError(undefined, body);
    }
    return price;
  }

  private makePriceOption(serviceCode: string, countryCode: string, price: string, record: Record<string, unknown> | null): ProviderPriceOption {
    return {
      serviceCode,
      countryCode,
      price,
      currency: record ? this.readStringField(record, ["currency", "currencyCode"]) ?? null : null,
      count: record ? this.readNumberField(record, ["count", "available", "quantity"]) : null,
      operator: record ? this.readStringField(record, ["operator", "network", "carrier"]) ?? null : null
    };
  }

  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      throw this.toProviderError(undefined, text);
    }
  }

  private requireRecord(value: unknown, body: string): Record<string, unknown> {
    const record = this.asRecord(value);
    if (!record) {
      throw this.toProviderError(undefined, body);
    }
    return record;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private readStringField(value: unknown, keys: string[]): string | undefined {
    const record = this.asRecord(value);
    if (!record) {
      return undefined;
    }

    for (const key of keys) {
      const field = record[key];
      if (typeof field === "string" && field.trim()) {
        return field.trim();
      }
      if (typeof field === "number") {
        return String(field);
      }
    }
    return undefined;
  }

  private readNumberField(value: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const field = value[key];
      if (typeof field === "number") {
        return field;
      }
      if (typeof field === "string") {
        const parsed = Number(field);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private requireApiKey(value: string | undefined): string {
    return this.requireText(value, "Hero SMS API key 未配置");
  }

  private requireText(value: string | undefined, message: string): string {
    const text = value?.trim();
    if (!text) {
      throw new HeroSmsProviderError(SmsErrorType.ProviderNotConfigured, message);
    }

    return text;
  }

  private toProviderError(status: number | undefined, body: string): HeroSmsProviderError {
    if (status === 401 || body === "BAD_KEY") {
      return new HeroSmsProviderError(SmsErrorType.ProviderNotConfigured, "Hero SMS API key 无效");
    }
    if (status === 402 || body === "NO_BALANCE") {
      return new HeroSmsProviderError(SmsErrorType.InsufficientBalance, "Hero SMS 余额不足");
    }
    if (body === "NO_NUMBERS") {
      return new HeroSmsProviderError(SmsErrorType.NoAvailableNumber, "Hero SMS 当前无可用号码");
    }
    if (status === 404 || body === "NO_ACTIVATION") {
      return new HeroSmsProviderError(SmsErrorType.AcquireNumberFailed, "Hero SMS 激活订单不存在");
    }
    if (status === 409) {
      return new HeroSmsProviderError(SmsErrorType.TaskStateConflict, "Hero SMS 当前订单状态不允许操作");
    }
    if (status === 400 || status === 422 || body === "BAD_ACTION" || body === "BAD_SERVICE" || body === "BAD_COUNTRY") {
      return new HeroSmsProviderError(SmsErrorType.ProviderNotConfigured, "Hero SMS 请求参数无效");
    }

    return new HeroSmsProviderError(SmsErrorType.ProviderUnavailable, "Hero SMS 接口响应格式异常");
  }
}

class HeroSmsProviderError extends Error {
  constructor(
    readonly errorType: SmsErrorType,
    readonly publicMessage: string
  ) {
    super(publicMessage);
    this.name = "HeroSmsProviderError";
  }
}
