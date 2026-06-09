import type { SmsMode } from "../../../domain/sms-task/SmsMode.js";
import type { AppDatabase } from "../database.js";
import { createId, nowIso } from "../id.js";
import { updateById } from "../sql.js";
import type { RedeemCodeRecord } from "../types.js";

export type CreateRedeemCodeInput = {
  codeHash: string;
  codeEncrypted: string;
  codeMasked: string;
  enabled?: boolean;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
  providerId: string;
  serviceCode?: string | null;
  countryCode?: string | null;
  operator?: string | null;
  maxPrice?: string | null;
  maxUseCount: number;
  expiresAt?: string | null;
};

export type UpdateRedeemCodeInput = Partial<{
  enabled: boolean;
  platformCode: string;
  platformName: string;
  smsMode: SmsMode;
  providerId: string;
  serviceCode: string | null;
  countryCode: string | null;
  operator: string | null;
  maxPrice: string | null;
  maxUseCount: number;
  expiresAt: string | null;
  currentTaskId: string | null;
}>;

export type RedeemCodeListFilter = {
  codeKeyword?: string;
  platformCode?: string;
  smsMode?: SmsMode;
  enabled?: boolean;
  page: number;
  pageSize: number;
};

export class RedeemCodeRepository {
  constructor(private readonly database: AppDatabase) {}

  create(input: CreateRedeemCodeInput): RedeemCodeRecord {
    const now = nowIso();
    const record: RedeemCodeRecord = {
      id: createId("redeem"),
      code_hash: input.codeHash,
      code_encrypted: input.codeEncrypted,
      code_masked: input.codeMasked,
      enabled: input.enabled === false ? 0 : 1,
      platform_code: input.platformCode,
      platform_name: input.platformName,
      sms_mode: input.smsMode,
      provider_id: input.providerId,
      service_code: input.serviceCode ?? null,
      country_code: input.countryCode ?? null,
      operator: input.operator ?? null,
      max_price: input.maxPrice ?? null,
      max_use_count: input.maxUseCount,
      used_count: 0,
      expires_at: input.expiresAt ?? null,
      current_task_id: null,
      last_used_at: null,
      created_at: now,
      updated_at: now,
      deleted: 0,
      version: 1
    };

    this.database
      .prepare(
        `INSERT INTO redeem_code (
          id, code_hash, code_encrypted, code_masked, enabled, platform_code, platform_name, sms_mode, provider_id,
          service_code, country_code, operator, max_price, max_use_count, used_count, expires_at, current_task_id,
          last_used_at, created_at, updated_at, deleted, version
        ) VALUES (
          @id, @code_hash, @code_encrypted, @code_masked, @enabled, @platform_code, @platform_name, @sms_mode, @provider_id,
          @service_code, @country_code, @operator, @max_price, @max_use_count, @used_count, @expires_at, @current_task_id,
          @last_used_at, @created_at, @updated_at, @deleted, @version
        )`
      )
      .run(record);

    return record;
  }

  findById(id: string): RedeemCodeRecord | undefined {
    return this.database.prepare("SELECT * FROM redeem_code WHERE id = ? AND deleted = 0").get(id) as
      | RedeemCodeRecord
      | undefined;
  }

  findByCodeHash(codeHash: string): RedeemCodeRecord | undefined {
    return this.database.prepare("SELECT * FROM redeem_code WHERE code_hash = ? AND deleted = 0").get(codeHash) as
      | RedeemCodeRecord
      | undefined;
  }

  list(filter: RedeemCodeListFilter): RedeemCodeRecord[] {
    const where = this.buildListWhere(filter);
    return this.database
      .prepare(`SELECT * FROM redeem_code ${where.sql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
      .all({ ...where.params, limit: filter.pageSize, offset: (filter.page - 1) * filter.pageSize }) as RedeemCodeRecord[];
  }

  count(filter: RedeemCodeListFilter): number {
    const where = this.buildListWhere(filter);
    const row = this.database.prepare(`SELECT COUNT(*) AS total FROM redeem_code ${where.sql}`).get(where.params) as { total: number };
    return row.total;
  }

  update(id: string, input: UpdateRedeemCodeInput): boolean {
    return updateById(this.database, "redeem_code", id, {
      enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
      platform_code: input.platformCode,
      platform_name: input.platformName,
      sms_mode: input.smsMode,
      provider_id: input.providerId,
      service_code: input.serviceCode,
      country_code: input.countryCode,
      operator: input.operator,
      max_price: input.maxPrice,
      max_use_count: input.maxUseCount,
      expires_at: input.expiresAt,
      current_task_id: input.currentTaskId,
      updated_at: nowIso(),
      version: this.nextVersion(id)
    });
  }

  occupy(id: string, taskId: string, version: number): boolean {
    const result = this.database
      .prepare(
        `UPDATE redeem_code
         SET current_task_id = ?, updated_at = ?, version = version + 1
         WHERE id = ? AND version = ? AND current_task_id IS NULL AND deleted = 0`
      )
      .run(taskId, nowIso(), id, version);

    return result.changes > 0;
  }

  release(id: string): boolean {
    const result = this.database
      .prepare(
        `UPDATE redeem_code
         SET current_task_id = NULL, updated_at = ?, version = version + 1
         WHERE id = ? AND deleted = 0`
      )
      .run(nowIso(), id);

    return result.changes > 0;
  }

  incrementUsedCount(id: string): boolean {
    const now = nowIso();
    const result = this.database
      .prepare(
        `UPDATE redeem_code
         SET used_count = used_count + 1, last_used_at = ?, updated_at = ?, version = version + 1
         WHERE id = ? AND deleted = 0`
      )
      .run(now, now, id);

    return result.changes > 0;
  }

  private buildListWhere(filter: RedeemCodeListFilter): { sql: string; params: Record<string, string | number> } {
    const clauses = ["deleted = 0"];
    const params: Record<string, string | number> = {};

    if (filter.codeKeyword) {
      clauses.push("code_masked LIKE @codeKeyword");
      params.codeKeyword = `%${filter.codeKeyword}%`;
    }
    if (filter.platformCode) {
      clauses.push("platform_code = @platformCode");
      params.platformCode = filter.platformCode;
    }
    if (filter.smsMode) {
      clauses.push("sms_mode = @smsMode");
      params.smsMode = filter.smsMode;
    }
    if (filter.enabled !== undefined) {
      clauses.push("enabled = @enabled");
      params.enabled = filter.enabled ? 1 : 0;
    }

    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private nextVersion(id: string): number | undefined {
    const record = this.findById(id);
    return record ? record.version + 1 : undefined;
  }
}
