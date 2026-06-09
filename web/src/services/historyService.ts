import { httpClient } from "./httpClient";
import type { HistoryDetail, HistoryListResult, HistoryQuery } from "../types/history";

export const historyService = {
  list(query: HistoryQuery = {}) {
    return httpClient<HistoryListResult>(`/sms-task-history${toQueryString(query)}`);
  },
  getDetail(taskId: string) {
    return httpClient<HistoryDetail>(`/sms-task-history/${taskId}`);
  }
};

function toQueryString(query: HistoryQuery): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}
