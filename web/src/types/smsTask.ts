import type { SmsErrorType } from "./error";
import type { SmsMode } from "./redeem";

export const SmsTaskStatus = {
  Created: "created",
  CodeValidated: "code_validated",
  NumberAcquiring: "number_acquiring",
  NumberAcquired: "number_acquired",
  WaitingCode: "waiting_code",
  CodeReceived: "code_received",
  Completed: "completed",
  Cancelled: "cancelled",
  Timeout: "timeout",
  Failed: "failed"
} as const;

export type SmsTaskStatus = (typeof SmsTaskStatus)[keyof typeof SmsTaskStatus];

export const terminalSmsTaskStatuses = new Set<SmsTaskStatus>([
  SmsTaskStatus.Completed,
  SmsTaskStatus.Cancelled,
  SmsTaskStatus.Timeout,
  SmsTaskStatus.Failed
]);

export type SmsTaskPlatform = {
  code: string;
  name: string;
};

export type SmsTaskDetail = {
  taskId: string;
  status: SmsTaskStatus;
  platform: SmsTaskPlatform;
  smsMode: SmsMode;
  phoneNumber: string | null;
  code?: string;
  waitStartedAt: string | null;
  waitTimeoutAt: string | null;
  codeReceivedAt: string | null;
  errorType: SmsErrorType | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WaitCodeResult = {
  taskId: string;
  status: SmsTaskStatus;
  waitStartedAt: string | null;
  waitTimeoutAt: string | null;
};

export type CancelTaskResult = {
  taskId: string;
  status: SmsTaskStatus;
  cancelledAt: string | null;
};

export type CompleteTaskResult = {
  taskId: string;
  status: SmsTaskStatus;
  completedAt: string | null;
};
