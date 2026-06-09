import type { SmsErrorType } from "./error";
import type { SmsMode } from "./redeem";
import type { SmsTaskPlatform, SmsTaskStatus } from "./smsTask";

export type HistoryQuery = {
  redeemCodeKeyword?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  status?: SmsTaskStatus;
  page?: number;
  pageSize?: number;
};

export type HistoryItem = {
  taskId: string;
  redeemCodeMasked: string;
  platform: SmsTaskPlatform;
  smsMode: SmsMode;
  phoneNumberMasked: string | null;
  status: SmsTaskStatus;
  codeReceivedAt: string | null;
  createdAt: string;
  finishedAt: string | null;
  errorType: SmsErrorType | null;
};

export type HistoryListResult = {
  items: HistoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type HistoryStatusLog = {
  status: SmsTaskStatus;
  fromStatus: SmsTaskStatus | null;
  errorType: SmsErrorType | null;
  message: string | null;
  createdAt: string;
};

export type HistoryDetail = HistoryItem & {
  providerName: string | null;
  updatedAt: string;
  errorMessage: string | null;
  statusLogs: HistoryStatusLog[];
};
