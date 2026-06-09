import { SmsErrorType } from "../domain/errors/SmsErrorType.js";
import { SmsTaskStatus } from "../domain/sms-task/SmsTaskStatus.js";
import { logger } from "../infrastructure/logger/logger.js";
import { revealProviderSecret, secureSmsCode } from "../infrastructure/security/secureFields.js";
import type { ProviderRepository } from "../infrastructure/storage/repositories/ProviderRepository.js";
import type { SmsTaskRepository } from "../infrastructure/storage/repositories/SmsTaskRepository.js";
import type { SmsTaskRecord } from "../infrastructure/storage/types.js";
import type { ProviderAdapter } from "../providers/index.js";

const POLL_INTERVAL_MS = 2_000;
const PROVIDER_TIMEOUT_MS = 3_000;

export type SmsCodeSchedulerDependencies = {
  smsTasks: SmsTaskRepository;
  providers: ProviderRepository;
  providerAdapters: Map<string, ProviderAdapter>;
  securityKey: string;
};

export class SmsCodeScheduler {
  private readonly activeTaskIds = new Set<string>();
  private readonly pollingTaskIds = new Set<string>();
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly dependencies: SmsCodeSchedulerDependencies) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.restoreWaitingTasks();
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  register(taskId: string): void {
    this.activeTaskIds.add(taskId);
  }

  private restoreWaitingTasks(): void {
    for (const task of this.dependencies.smsTasks.listWaitingCodeTasks()) {
      if (this.isTimedOut(task)) {
        this.markTimeout(task);
        continue;
      }

      this.register(task.id);
    }
  }

  private async tick(): Promise<void> {
    await Promise.all([...this.activeTaskIds].map((taskId) => this.pollTask(taskId)));
  }

  private async pollTask(taskId: string): Promise<void> {
    if (this.pollingTaskIds.has(taskId)) {
      return;
    }

    this.pollingTaskIds.add(taskId);
    try {
      const task = this.dependencies.smsTasks.findById(taskId);
      if (!task || task.status !== SmsTaskStatus.WaitingCode) {
        this.activeTaskIds.delete(taskId);
        return;
      }

      if (this.isTimedOut(task)) {
        this.markTimeout(task);
        this.activeTaskIds.delete(taskId);
        return;
      }

      if (!task.provider_order_id) {
        this.markFailed(task, SmsErrorType.AcquireNumberFailed, "Provider 订单不存在");
        this.activeTaskIds.delete(taskId);
        return;
      }

      const provider = this.dependencies.providers.findById(task.provider_id);
      const adapter = provider ? this.dependencies.providerAdapters.get(provider.name) : undefined;
      if (!provider || provider.enabled !== 1 || !adapter) {
        this.markFailed(task, SmsErrorType.ProviderUnavailable, "接码服务暂不可用");
        this.activeTaskIds.delete(taskId);
        return;
      }

      const result = await adapter.pollCode({
        providerId: provider.id,
        providerSecret: provider.secret_encrypted ? revealProviderSecret(provider.secret_encrypted, this.dependencies.securityKey) : undefined,
        providerOrderId: task.provider_order_id,
        timeoutMs: PROVIDER_TIMEOUT_MS
      });

      if (!result.ok) {
        this.markFailed(task, result.errorType, result.message);
        this.activeTaskIds.delete(taskId);
        return;
      }

      if (!result.data.smsCode) {
        return;
      }

      const now = new Date().toISOString();
      const code = secureSmsCode(result.data.smsCode, this.dependencies.securityKey);
      const updated = this.dependencies.smsTasks.updateWaitingTask(task.id, task.version, {
        status: SmsTaskStatus.CodeReceived,
        smsCodeEncrypted: code.smsCodeEncrypted,
        codeReceivedAt: now
      });

      if (updated) {
        this.dependencies.smsTasks.createStatusLog({
          taskId: task.id,
          fromStatus: SmsTaskStatus.WaitingCode,
          toStatus: SmsTaskStatus.CodeReceived
        });
        logger.info("SMS code received", { taskId: task.id });
      }

      this.activeTaskIds.delete(taskId);
    } catch (error) {
      logger.error("SMS code polling failed", { taskId, error });
    } finally {
      this.pollingTaskIds.delete(taskId);
    }
  }

  private isTimedOut(task: SmsTaskRecord): boolean {
    return Boolean(task.wait_timeout_at && task.wait_timeout_at <= new Date().toISOString());
  }

  private markTimeout(task: SmsTaskRecord): void {
    const updated = this.dependencies.smsTasks.updateWaitingTask(task.id, task.version, {
      status: SmsTaskStatus.Timeout,
      errorType: SmsErrorType.WaitCodeTimeout,
      errorMessage: "等待验证码超时",
      finishedAt: new Date().toISOString()
    });

    if (!updated) {
      return;
    }

    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: SmsTaskStatus.WaitingCode,
      toStatus: SmsTaskStatus.Timeout,
      errorType: SmsErrorType.WaitCodeTimeout,
      message: "等待验证码超时"
    });
  }

  private markFailed(task: SmsTaskRecord, errorType: SmsErrorType, message: string): void {
    const updated = this.dependencies.smsTasks.updateWaitingTask(task.id, task.version, {
      status: SmsTaskStatus.Failed,
      errorType,
      errorMessage: message,
      finishedAt: new Date().toISOString()
    });

    if (!updated) {
      return;
    }

    this.dependencies.smsTasks.createStatusLog({
      taskId: task.id,
      fromStatus: SmsTaskStatus.WaitingCode,
      toStatus: SmsTaskStatus.Failed,
      errorType,
      message
    });
  }
}
