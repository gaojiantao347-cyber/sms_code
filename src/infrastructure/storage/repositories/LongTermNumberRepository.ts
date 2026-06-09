import type { AppDatabase } from "../database.js";
import { createId, nowIso } from "../id.js";
import { updateById } from "../sql.js";
import type { LongTermNumberRecord } from "../types.js";

export type CreateLongTermNumberInput = {
  providerId: string;
  phoneNumberEncrypted: string;
  phoneNumberMasked: string;
  enabled?: boolean;
  boundRedeemCodeId?: string | null;
};

export type UpdateLongTermNumberInput = Partial<{
  enabled: boolean;
  phoneNumberEncrypted: string;
  phoneNumberMasked: string;
  boundRedeemCodeId: string | null;
  currentTaskId: string | null;
}>;

export class LongTermNumberRepository {
  constructor(private readonly database: AppDatabase) {}

  create(input: CreateLongTermNumberInput): LongTermNumberRecord {
    const now = nowIso();
    const record: LongTermNumberRecord = {
      id: createId("longnum"),
      provider_id: input.providerId,
      phone_number_encrypted: input.phoneNumberEncrypted,
      phone_number_masked: input.phoneNumberMasked,
      enabled: input.enabled === false ? 0 : 1,
      bound_redeem_code_id: input.boundRedeemCodeId ?? null,
      current_task_id: null,
      last_used_at: null,
      use_count: 0,
      created_at: now,
      updated_at: now,
      deleted: 0,
      version: 1
    };

    this.database
      .prepare(
        `INSERT INTO long_term_number (
          id, provider_id, phone_number_encrypted, phone_number_masked, enabled,
          bound_redeem_code_id, current_task_id, last_used_at, use_count,
          created_at, updated_at, deleted, version
        ) VALUES (
          @id, @provider_id, @phone_number_encrypted, @phone_number_masked, @enabled,
          @bound_redeem_code_id, @current_task_id, @last_used_at, @use_count,
          @created_at, @updated_at, @deleted, @version
        )`
      )
      .run(record);

    return record;
  }

  findById(id: string): LongTermNumberRecord | undefined {
    return this.database.prepare("SELECT * FROM long_term_number WHERE id = ? AND deleted = 0").get(id) as
      | LongTermNumberRecord
      | undefined;
  }

  findAvailable(providerId: string, boundRedeemCodeId?: string): LongTermNumberRecord | undefined {
    if (boundRedeemCodeId) {
      return this.database
        .prepare(
          `SELECT * FROM long_term_number
           WHERE provider_id = ? AND enabled = 1 AND deleted = 0 AND current_task_id IS NULL
           AND (bound_redeem_code_id IS NULL OR bound_redeem_code_id = ?)
           ORDER BY last_used_at IS NOT NULL, last_used_at ASC, created_at ASC
           LIMIT 1`
        )
        .get(providerId, boundRedeemCodeId) as LongTermNumberRecord | undefined;
    }

    return this.database
      .prepare(
        `SELECT * FROM long_term_number
         WHERE provider_id = ? AND enabled = 1 AND deleted = 0 AND current_task_id IS NULL
         ORDER BY last_used_at IS NOT NULL, last_used_at ASC, created_at ASC
         LIMIT 1`
      )
      .get(providerId) as LongTermNumberRecord | undefined;
  }

  update(id: string, input: UpdateLongTermNumberInput): boolean {
    const record = this.findById(id);
    if (!record) {
      return false;
    }

    return updateById(this.database, "long_term_number", id, {
      enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
      phone_number_encrypted: input.phoneNumberEncrypted,
      phone_number_masked: input.phoneNumberMasked,
      bound_redeem_code_id: input.boundRedeemCodeId,
      current_task_id: input.currentTaskId,
      updated_at: nowIso(),
      version: record.version + 1
    });
  }

  occupy(id: string, taskId: string, version: number): boolean {
    const result = this.database
      .prepare(
        `UPDATE long_term_number
         SET current_task_id = ?, updated_at = ?, version = version + 1
         WHERE id = ? AND version = ? AND current_task_id IS NULL AND deleted = 0`
      )
      .run(taskId, nowIso(), id, version);

    return result.changes > 0;
  }

  release(id: string): boolean {
    const result = this.database
      .prepare(
        `UPDATE long_term_number
         SET current_task_id = NULL, updated_at = ?, version = version + 1
         WHERE id = ? AND deleted = 0`
      )
      .run(nowIso(), id);

    return result.changes > 0;
  }

  markUsed(id: string): boolean {
    const now = nowIso();
    const result = this.database
      .prepare(
        `UPDATE long_term_number
         SET use_count = use_count + 1, last_used_at = ?, updated_at = ?, version = version + 1
         WHERE id = ? AND deleted = 0`
      )
      .run(now, now, id);

    return result.changes > 0;
  }
}
