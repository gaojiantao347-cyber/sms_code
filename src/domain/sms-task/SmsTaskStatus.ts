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
