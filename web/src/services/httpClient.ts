import { ApiClientError, type ApiResponse } from "../types/api";
import { SmsErrorType } from "../types/error";

const apiBasePath = "/api/v2";

type HttpMethod = "GET" | "POST" | "PATCH";

type HttpClientOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
};

export async function httpClient<T>(path: string, options: HttpClientOptions = {}): Promise<T> {
  const response = await fetch(`${apiBasePath}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload) {
    throw new ApiClientError({ type: SmsErrorType.InternalError, message: "接口响应格式异常" });
  }

  if (!response.ok && payload.success) {
    throw new ApiClientError({ type: SmsErrorType.InternalError, message: "请求失败" }, payload.requestId);
  }

  if (!payload.success) {
    throw new ApiClientError(payload.error, payload.requestId);
  }

  return payload.data;
}
