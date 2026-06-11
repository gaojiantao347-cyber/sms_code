import type { SmsErrorType } from "../../../domain/errors/SmsErrorType.js";
import type { SmsMode } from "../../../domain/sms-task/SmsMode.js";
import type { SmsTaskStatus } from "../../../domain/sms-task/SmsTaskStatus.js";
import type { AppDatabase } from "../database.js";
import { createId, nowIso } from "../id.js";
import { updateById } from "../sql.js";
import type { SmsTaskRecord, SmsTaskStatusLogRecord } from "../types.js";

export type CreateSmsTaskInput = {
  redeemCodeId: string;
  providerId: string;
  longTermNumberId?: string | null;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
  status: SmsTaskStatus;
};

export type UpdateSmsTaskInput = Partial<{
  providerId: string;
  longTermNumberId: string | null;
  providerOrderId: string | null;
  phoneNumberEncrypted: string | null;
  phoneNumberMasked: string | null;
  smsCodeEncrypted: string | null;
  status: SmsTaskStatus;
  errorType: SmsErrorType | null;
  errorMessage: string | null;
  waitStartedAt: string | null;
  waitTimeoutAt: string | null;
  codeReceivedAt: string | null;
  finishedAt: string | null;
}>;

export type CreateStatusLogInput = {
  taskId: string;
  fromStatus?: SmsTaskStatus | null;
  toStatus: SmsTaskStatus;
  errorType?: SmsErrorType | null;
  message?: string | null;
};

export type SmsTaskHistoryFilter = {
  redeemCodeKeyword?: string;
  redeemCodeHash?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  status?: SmsTaskStatus;
  page: number;
  pageSize: number;
};

export type SmsTaskHistoryRecord = SmsTaskRecord & {
  redeem_code_masked: string;
  provider_name: string | null;
};

export class SmsTaskRepository {
  constructor(private readonly database: AppDatabase) {}

  create(input: CreateSmsTaskInput): SmsTaskRecord {
    const now = nowIso();
    const record: SmsTaskRecord = {
      id: createId("task"),
      redeem_code_id: input.redeemCodeId,
      provider_id: input.providerId,
      long_term_number_id: input.longTermNumberId ?? null,
      platform_code: input.platformCode,
      platform_name: input.platformName,
      sms_mode: input.smsMode,
      provider_order_id: null,
      phone_number_encrypted: null,
      phone_number_masked: null,
      sms_code_encrypted: null,
      status: input.status,
      error_type: null,
      error_message: null,
      wait_started_at: null,
      wait_timeout_at: null,
      code_received_at: null,
      finished_at: null,
      created_at: now,
      updated_at: now,
      version: 1
    };

    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO sms_task (
            id, redeem_code_id, provider_id, long_term_number_id, platform_code, platform_name,
            sms_mode, provider_order_id, phone_number_encrypted, phone_number_masked,
            sms_code_encrypted, status, error_type, error_message, wait_started_at,
            wait_timeout_at, code_received_at, finished_at, created_at, updated_at, version
          ) VALUES (
            @id, @redeem_code_id, @provider_id, @long_term_number_id, @platform_code, @platform_name,
            @sms_mode, @provider_order_id, @phone_number_encrypted, @phone_number_masked,
            @sms_code_encrypted, @status, @error_type, @error_message, @wait_started_at,
            @wait_timeout_at, @code_received_at, @finished_at, @created_at, @updated_at, @version
          )`
        )
        .run(record);

      this.createStatusLog({ taskId: record.id, toStatus: record.status });
    });

    transaction();
    return record;
  }

  findById(id: string): SmsTaskRecord | undefined {
    return this.database.prepare("SELECT * FROM sms_task WHERE id = ?").get(id) as SmsTaskRecord | undefined;
  }

  listWaitingCodeTasks(): SmsTaskRecord[] {
    return this.database.prepare("SELECT * FROM sms_task WHERE status = 'waiting_code' ORDER BY updated_at ASC").all() as SmsTaskRecord[];
  }

  listHistory(filter: SmsTaskHistoryFilter): SmsTaskHistoryRecord[] {
    return this.database
      .prepare(`${this.historySelectSql()} ${this.historyWhereSql(filter)} ORDER BY task.created_at DESC LIMIT @limit OFFSET @offset`)
      .all(this.toHistoryQueryParams(filter)) as SmsTaskHistoryRecord[];
  }

  countHistory(filter: SmsTaskHistoryFilter): number {
    const row = this.database
      .prepare(`SELECT COUNT(*) AS total FROM sms_task task JOIN redeem_code redeem ON redeem.id = task.redeem_code_id ${this.historyWhereSql(filter)}`)
      .get(this.toHistoryQueryParams(filter)) as { total: number };
    return row.total;
  }

  findHistoryById(id: string): SmsTaskHistoryRecord | undefined {
    return this.database.prepare(`${this.historySelectSql()} WHERE task.id = @id`).get({ id }) as SmsTaskHistoryRecord | undefined;
  }

  update(id: string, input: UpdateSmsTaskInput): boolean {
    const record = this.findById(id);
    if (!record) {
      return false;
    }

    return updateById(this.database, "sms_task", id, {
      provider_id: input.providerId,
      long_term_number_id: input.longTermNumberId,
      provider_order_id: input.providerOrderId,
      phone_number_encrypted: input.phoneNumberEncrypted,
      phone_number_masked: input.phoneNumberMasked,
      sms_code_encrypted: input.smsCodeEncrypted,
      status: input.status,
      error_type: input.errorType,
      error_message: input.errorMessage,
      wait_started_at: input.waitStartedAt,
      wait_timeout_at: input.waitTimeoutAt,
      code_received_at: input.codeReceivedAt,
      finished_at: input.finishedAt,
      updated_at: nowIso(),
      version: record.version + 1
    });
  }

  updateWaitingTask(id: string, version: number, input: UpdateSmsTaskInput): boolean {
    const changes = {
      sms_code_encrypted: input.smsCodeEncrypted,
      status: input.status,
      error_type: input.errorType,
      error_message: input.errorMessage,
      code_received_at: input.codeReceivedAt,
      finished_at: input.finishedAt,
      updated_at: nowIso()
    };
    const entries = Object.entries(changes).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return false;
    }

    const assignments = entries.map(([key]) => `${key} = @${key}`).join(", ");
    const result = this.database
      .prepare(
        `UPDATE sms_task
         SET ${assignments}, version = version + 1
         WHERE id = @id AND status = 'waiting_code' AND version = @version`
      )
      .run({ id, version, ...Object.fromEntries(entries) });

    return result.changes > 0;
  }

  updateStatus(id: string, fromStatus: SmsTaskStatus, toStatus: SmsTaskStatus, version: number): boolean {
    const now = nowIso();
    const result = this.database
      .prepare(
        `UPDATE sms_task
         SET status = ?, updated_at = ?, version = version + 1
         WHERE id = ? AND status = ? AND version = ?`
      )
      .run(toStatus, now, id, fromStatus, version);

    if (result.changes === 0) {
      return false;
    }

    this.createStatusLog({ taskId: id, fromStatus, toStatus });
    return true;
  }

  createStatusLog(input: CreateStatusLogInput): SmsTaskStatusLogRecord {
    const record: SmsTaskStatusLogRecord = {
      id: createId("log"),
      task_id: input.taskId,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus,
      error_type: input.errorType ?? null,
      message: input.message ?? null,
      created_at: nowIso()
    };

    this.database
      .prepare(
        `INSERT INTO sms_task_status_log (
          id, task_id, from_status, to_status, error_type, message, created_at
        ) VALUES (
          @id, @task_id, @from_status, @to_status, @error_type, @message, @created_at
        )`
      )
      .run(record);

    return record;
  }

  listStatusLogs(taskId: string): SmsTaskStatusLogRecord[] {
    return this.database
      .prepare("SELECT * FROM sms_task_status_log WHERE task_id = ? ORDER BY created_at ASC")
      .all(taskId) as SmsTaskStatusLogRecord[];
  }

  private historySelectSql(): string {
    return `SELECT
      task.*,
      redeem.code_masked AS redeem_code_masked,
      provider.name AS provider_name
    FROM sms_task task
    JOIN redeem_code redeem ON redeem.id = task.redeem_code_id
    LEFT JOIN provider_config provider ON provider.id = task.provider_id`;
  }

  private historyWhereSql(filter: Partial<SmsTaskHistoryFilter>): string {
    const conditions = ["redeem.deleted = 0"];
    if (filter.redeemCodeKeyword) {
      conditions.push("(redeem.code_hash = @redeemCodeHash OR redeem.code_masked LIKE @redeemCodeKeyword)");
    }
    if (filter.platformCode) {
      conditions.push("task.platform_code = @platformCode");
    }
    if (filter.smsMode) {
      conditions.push("task.sms_mode = @smsMode");
    }
    if (filter.status) {
      conditions.push("task.status = @status");
    }
    return `WHERE ${conditions.join(" AND ")}`;
  }

  private toHistoryQueryParams(filter: SmsTaskHistoryFilter): Record<string, string | number | undefined> {
    return {
      redeemCodeKeyword: filter.redeemCodeKeyword ? `%${filter.redeemCodeKeyword}%` : undefined,
      redeemCodeHash: filter.redeemCodeHash,
      platformCode: filter.platformCode,
      smsMode: filter.smsMode,
      status: filter.status,
      limit: filter.pageSize,
      offset: (filter.page - 1) * filter.pageSize
    };
  }
}
