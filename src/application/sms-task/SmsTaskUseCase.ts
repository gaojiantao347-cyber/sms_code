import { SmsError } from "../../domain/errors/SmsError.js";
import { SmsErrorType } from "../../domain/errors/SmsErrorType.js";
import { SmsTaskStatus, terminalSmsTaskStatuses } from "../../domain/sms-task/SmsTaskStatus.js";
import { revealPhoneNumber, revealSmsCode } from "../../infrastructure/security/secureFields.js";
import type { SmsTaskRepository } from "../../infrastructure/storage/repositories/SmsTaskRepository.js";
import type { SmsTaskRecord } from "../../infrastructure/storage/types.js";

const WAIT_TIMEOUT_SECONDS = 300;

type TaskPlatform = {
  code: string;
  name: string;
};

export type SmsTaskDetailOutput = {
  taskId: string;
  status: SmsTaskStatus;
  platform: TaskPlatform;
  smsMode: SmsTaskRecord["sms_mode"];
  phoneNumber: string | null;
  code?: string;
  waitStartedAt: string | null;
  waitTimeoutAt: string | null;
  codeReceivedAt: string | null;
  errorType: SmsTaskRecord["error_type"];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WaitCodeOutput = {
  taskId: string;
  status: SmsTaskStatus;
  waitStartedAt: string | null;
  waitTimeoutAt: string | null;
};

export type CancelTaskOutput = {
  taskId: string;
  status: SmsTaskStatus;
  cancelledAt: string | null;
};

export type CompleteTaskOutput = {
  taskId: string;
  status: SmsTaskStatus;
  completedAt: string | null;
};

export type SmsTaskScheduler = {
  register(taskId: string): void;
};

export type SmsTaskUseCaseDependencies = {
  smsTasks: SmsTaskRepository;
  securityKey: string;
  scheduler?: SmsTaskScheduler;
};

export class SmsTaskUseCase {
  constructor(private readonly dependencies: SmsTaskUseCaseDependencies) {}

  getTask(taskId: string): SmsTaskDetailOutput {
    const task = this.requireTask(taskId);
    const output: SmsTaskDetailOutput = {
      taskId: task.id,
      status: task.status,
      platform: {
        code: task.platform_code,
        name: task.platform_name
      },
      smsMode: task.sms_mode,
      phoneNumber: task.phone_number_encrypted ? revealPhoneNumber(task.phone_number_encrypted, this.dependencies.securityKey) : null,
      waitStartedAt: task.wait_started_at,
      waitTimeoutAt: task.wait_timeout_at,
      codeReceivedAt: task.code_received_at,
      errorType: task.error_type,
      errorMessage: task.error_message,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    if ((task.status === SmsTaskStatus.CodeReceived || task.status === SmsTaskStatus.Completed) && task.sms_code_encrypted) {
      output.code = revealSmsCode(task.sms_code_encrypted, this.dependencies.securityKey);
    }

    return output;
  }

  waitCode(taskId: string): WaitCodeOutput {
    const task = this.requireTask(taskId);

    if (task.status === SmsTaskStatus.WaitingCode) {
      this.dependencies.scheduler?.register(task.id);
      return this.toWaitCodeOutput(task);
    }

    if (task.status !== SmsTaskStatus.NumberAcquired) {
      throw new SmsError(SmsErrorType.TaskStateConflict, "任务状态不允许开始等码");
    }

    const waitStartedAt = new Date();
    const waitTimeoutAt = new Date(waitStartedAt.getTime() + WAIT_TIMEOUT_SECONDS * 1000);
    this.dependencies.smsTasks.update(task.id, {
      status: SmsTaskStatus.WaitingCode,
      waitStartedAt: waitStartedAt.toISOString(),
      waitTimeoutAt: waitTimeoutAt.toISOString()
    });
    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: SmsTaskStatus.WaitingCode
    });
    this.dependencies.scheduler?.register(task.id);

    return this.toWaitCodeOutput(this.requireTask(task.id));
  }

  cancel(taskId: string, reason?: string): CancelTaskOutput {
    const task = this.requireTask(taskId);

    if (terminalSmsTaskStatuses.has(task.status)) {
      return this.toCancelTaskOutput(task);
    }

    if (task.status !== SmsTaskStatus.NumberAcquired && task.status !== SmsTaskStatus.WaitingCode) {
      throw new SmsError(SmsErrorType.TaskStateConflict, "任务状态不允许取消");
    }

    const finishedAt = new Date().toISOString();
    this.dependencies.smsTasks.update(task.id, {
      status: SmsTaskStatus.Cancelled,
      errorType: SmsErrorType.UserCancelled,
      errorMessage: reason?.trim() || "用户取消任务",
      finishedAt
    });
    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: SmsTaskStatus.Cancelled,
      errorType: SmsErrorType.UserCancelled,
      message: reason?.trim() || "用户取消任务"
    });

    return this.toCancelTaskOutput(this.requireTask(task.id));
  }

  complete(taskId: string): CompleteTaskOutput {
    const task = this.requireTask(taskId);

    if (task.status === SmsTaskStatus.Completed) {
      return this.toCompleteTaskOutput(task);
    }

    if (task.status !== SmsTaskStatus.CodeReceived) {
      throw new SmsError(SmsErrorType.TaskStateConflict, "任务状态不允许完成");
    }

    const finishedAt = new Date().toISOString();
    this.dependencies.smsTasks.update(task.id, {
      status: SmsTaskStatus.Completed,
      finishedAt
    });
    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: SmsTaskStatus.Completed
    });

    return this.toCompleteTaskOutput(this.requireTask(task.id));
  }

  private requireTask(taskId: string): SmsTaskRecord {
    const task = this.dependencies.smsTasks.findById(taskId);
    if (!task) {
      throw new SmsError(SmsErrorType.TaskNotFound, "任务不存在", 404);
    }

    return task;
  }

  private toWaitCodeOutput(task: SmsTaskRecord): WaitCodeOutput {
    return {
      taskId: task.id,
      status: task.status,
      waitStartedAt: task.wait_started_at,
      waitTimeoutAt: task.wait_timeout_at
    };
  }

  private toCancelTaskOutput(task: SmsTaskRecord): CancelTaskOutput {
    return {
      taskId: task.id,
      status: task.status,
      cancelledAt: task.status === SmsTaskStatus.Cancelled ? task.finished_at : null
    };
  }

  private toCompleteTaskOutput(task: SmsTaskRecord): CompleteTaskOutput {
    return {
      taskId: task.id,
      status: task.status,
      completedAt: task.status === SmsTaskStatus.Completed ? task.finished_at : null
    };
  }
}
