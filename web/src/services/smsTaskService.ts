import { httpClient } from "./httpClient";
import type { CancelTaskResult, CompleteTaskResult, SmsTaskDetail, WaitCodeResult } from "../types/smsTask";

export const smsTaskService = {
  getTask(taskId: string) {
    return httpClient<SmsTaskDetail>(`/sms-tasks/${taskId}`);
  },
  waitCode(taskId: string) {
    return httpClient<WaitCodeResult>(`/sms-tasks/${taskId}/wait-code`, { method: "POST" });
  },
  cancel(taskId: string, reason?: string) {
    return httpClient<CancelTaskResult>(`/sms-tasks/${taskId}/cancel`, { method: "POST", body: { reason } });
  },
  complete(taskId: string) {
    return httpClient<CompleteTaskResult>(`/sms-tasks/${taskId}/complete`, { method: "POST" });
  }
};
