import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import type { SmsMode } from "../../domain/sms-task/SmsMode.js";
import type { SmsTaskStatus } from "../../domain/sms-task/SmsTaskStatus.js";
import type { SmsTaskHistoryFilter, SmsTaskHistoryRecord, SmsTaskRepository } from "../../infrastructure/storage/repositories/SmsTaskRepository.js";
import type { SmsTaskStatusLogRecord } from "../../infrastructure/storage/types.js";

type TaskPlatform = {
  code: string;
  name: string;
};

export type SmsTaskHistoryListInput = {
  redeemCodeKeyword?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  status?: SmsTaskStatus;
  page?: number;
  pageSize?: number;
};

export type SmsTaskHistoryListItemOutput = {
  taskId: string;
  redeemCodeMasked: string;
  platform: TaskPlatform;
  smsMode: SmsMode;
  phoneNumberMasked: string | null;
  status: SmsTaskStatus;
  codeReceivedAt: string | null;
  createdAt: string;
  finishedAt: string | null;
  errorType: SmsTaskHistoryRecord["error_type"];
};

export type SmsTaskHistoryListOutput = {
  items: SmsTaskHistoryListItemOutput[];
  page: number;
  pageSize: number;
  total: number;
};

export type SmsTaskHistoryStatusLogOutput = {
  status: SmsTaskStatus;
  fromStatus: SmsTaskStatus | null;
  errorType: SmsTaskStatusLogRecord["error_type"];
  message: string | null;
  createdAt: string;
};

export type SmsTaskHistoryDetailOutput = SmsTaskHistoryListItemOutput & {
  providerName: string | null;
  updatedAt: string;
  errorMessage: string | null;
  statusLogs: SmsTaskHistoryStatusLogOutput[];
};

export type SmsTaskHistoryUseCaseDependencies = {
  smsTasks: SmsTaskRepository;
};

export class SmsTaskHistoryUseCase {
  constructor(private readonly dependencies: SmsTaskHistoryUseCaseDependencies) {}

  listHistory(input: SmsTaskHistoryListInput): SmsTaskHistoryListOutput {
    const filter = this.toFilter(input);
    const items = this.dependencies.smsTasks.listHistory(filter).map((task) => this.toListItem(task));
    return {
      items,
      page: filter.page,
      pageSize: filter.pageSize,
      total: this.dependencies.smsTasks.countHistory(filter)
    };
  }

  getHistoryDetail(taskId: string): SmsTaskHistoryDetailOutput {
    const task = this.dependencies.smsTasks.findHistoryById(taskId);
    if (!task) {
      throw new SmsError(SmsErrorType.TaskNotFound, "任务不存在", 404);
    }

    return {
      ...this.toListItem(task),
      providerName: task.provider_name,
      updatedAt: task.updated_at,
      errorMessage: task.error_message,
      statusLogs: this.dependencies.smsTasks.listStatusLogs(task.id).map((log) => ({
        status: log.to_status,
        fromStatus: log.from_status,
        errorType: log.error_type,
        message: log.message,
        createdAt: log.created_at
      }))
    };
  }

  private toFilter(input: SmsTaskHistoryListInput): SmsTaskHistoryFilter {
    return {
      redeemCodeKeyword: input.redeemCodeKeyword?.trim() || undefined,
      platformCode: input.platformCode?.trim() || undefined,
      smsMode: input.smsMode,
      status: input.status,
      page: normalizePositiveInteger(input.page, 1, 1, 1000000),
      pageSize: normalizePositiveInteger(input.pageSize, 20, 1, 100)
    };
  }

  private toListItem(task: SmsTaskHistoryRecord): SmsTaskHistoryListItemOutput {
    return {
      taskId: task.id,
      redeemCodeMasked: task.redeem_code_masked,
      platform: {
        code: task.platform_code,
        name: task.platform_name
      },
      smsMode: task.sms_mode,
      phoneNumberMasked: task.phone_number_masked,
      status: task.status,
      codeReceivedAt: task.code_received_at,
      createdAt: task.created_at,
      finishedAt: task.finished_at,
      errorType: task.error_type
    };
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isInteger(value) || value < min) {
    return fallback;
  }
  return Math.min(value, max);
}
