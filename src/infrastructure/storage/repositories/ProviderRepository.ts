import type { ProviderCapability } from "../../../domain/provider/ProviderCapability.js";
import type { AppDatabase } from "../database.js";
import { createId, nowIso } from "../id.js";
import { updateById } from "../sql.js";
import type { ProviderCapabilityRecord, ProviderConfigRecord } from "../types.js";

export type CreateProviderInput = {
  name: string;
  enabled?: boolean;
  secretEncrypted?: string | null;
  secretMasked?: string | null;
  defaultServiceCode?: string | null;
  defaultCountryCode?: string | null;
  capabilities?: Array<{ capabilityCode: ProviderCapability; enabled: boolean }>;
};

export type UpdateProviderInput = Partial<{
  name: string;
  enabled: boolean;
  secretEncrypted: string | null;
  secretMasked: string | null;
  defaultServiceCode: string | null;
  defaultCountryCode: string | null;
}>;

export type ProviderListFilter = {
  nameKeyword?: string;
  enabled?: boolean;
  page: number;
  pageSize: number;
};

export class ProviderRepository {
  constructor(private readonly database: AppDatabase) {}

  create(input: CreateProviderInput): ProviderConfigRecord {
    const now = nowIso();
    const record: ProviderConfigRecord = {
      id: createId("provider"),
      name: input.name,
      enabled: input.enabled === false ? 0 : 1,
      secret_encrypted: input.secretEncrypted ?? null,
      secret_masked: input.secretMasked ?? null,
      default_service_code: input.defaultServiceCode ?? null,
      default_country_code: input.defaultCountryCode ?? null,
      created_at: now,
      updated_at: now,
      deleted: 0,
      version: 1
    };

    const insertProvider = this.database.prepare(
      `INSERT INTO provider_config (
        id, name, enabled, secret_encrypted, secret_masked, default_service_code,
        default_country_code, created_at, updated_at, deleted, version
      ) VALUES (
        @id, @name, @enabled, @secret_encrypted, @secret_masked, @default_service_code,
        @default_country_code, @created_at, @updated_at, @deleted, @version
      )`
    );

    const transaction = this.database.transaction(() => {
      insertProvider.run(record);
      for (const capability of input.capabilities ?? []) {
        this.setCapability(record.id, capability.capabilityCode, capability.enabled);
      }
    });

    transaction();
    return record;
  }

  findById(id: string): ProviderConfigRecord | undefined {
    return this.database.prepare("SELECT * FROM provider_config WHERE id = ? AND deleted = 0").get(id) as
      | ProviderConfigRecord
      | undefined;
  }

  listEnabled(): ProviderConfigRecord[] {
    return this.database.prepare("SELECT * FROM provider_config WHERE enabled = 1 AND deleted = 0 ORDER BY created_at DESC").all() as ProviderConfigRecord[];
  }

  list(filter: ProviderListFilter): ProviderConfigRecord[] {
    const where = this.buildListWhere(filter);
    return this.database
      .prepare(`SELECT * FROM provider_config ${where.sql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
      .all({ ...where.params, limit: filter.pageSize, offset: (filter.page - 1) * filter.pageSize }) as ProviderConfigRecord[];
  }

  count(filter: ProviderListFilter): number {
    const where = this.buildListWhere(filter);
    const row = this.database.prepare(`SELECT COUNT(*) AS total FROM provider_config ${where.sql}`).get(where.params) as { total: number };
    return row.total;
  }

  update(id: string, input: UpdateProviderInput): boolean {
    const record = this.findById(id);
    if (!record) {
      return false;
    }

    return updateById(this.database, "provider_config", id, {
      name: input.name,
      enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
      secret_encrypted: input.secretEncrypted,
      secret_masked: input.secretMasked,
      default_service_code: input.defaultServiceCode,
      default_country_code: input.defaultCountryCode,
      updated_at: nowIso(),
      version: record.version + 1
    });
  }

  setCapability(providerId: string, capabilityCode: ProviderCapability, enabled: boolean): ProviderCapabilityRecord {
    const now = nowIso();
    const existing = this.findCapability(providerId, capabilityCode);

    if (existing) {
      const updated: ProviderCapabilityRecord = {
        ...existing,
        enabled: enabled ? 1 : 0,
        updated_at: now
      };
      this.database
        .prepare("UPDATE provider_capability SET enabled = @enabled, updated_at = @updated_at WHERE id = @id")
        .run(updated);
      return updated;
    }

    const record: ProviderCapabilityRecord = {
      id: createId("capability"),
      provider_id: providerId,
      capability_code: capabilityCode,
      enabled: enabled ? 1 : 0,
      created_at: now,
      updated_at: now
    };

    this.database
      .prepare(
        `INSERT INTO provider_capability (
          id, provider_id, capability_code, enabled, created_at, updated_at
        ) VALUES (
          @id, @provider_id, @capability_code, @enabled, @created_at, @updated_at
        )`
      )
      .run(record);

    return record;
  }

  listCapabilities(providerId: string): ProviderCapabilityRecord[] {
    return this.database.prepare("SELECT * FROM provider_capability WHERE provider_id = ? ORDER BY capability_code").all(providerId) as ProviderCapabilityRecord[];
  }

  replaceCapabilities(providerId: string, capabilities: Array<{ capabilityCode: ProviderCapability; enabled: boolean }>): void {
    const transaction = this.database.transaction(() => {
      this.database.prepare("DELETE FROM provider_capability WHERE provider_id = ?").run(providerId);
      for (const capability of capabilities) {
        this.setCapability(providerId, capability.capabilityCode, capability.enabled);
      }
    });
    transaction();
  }

  private buildListWhere(filter: ProviderListFilter): { sql: string; params: Record<string, string | number> } {
    const clauses = ["deleted = 0"];
    const params: Record<string, string | number> = {};

    if (filter.nameKeyword) {
      clauses.push("name LIKE @nameKeyword");
      params.nameKeyword = `%${filter.nameKeyword}%`;
    }
    if (filter.enabled !== undefined) {
      clauses.push("enabled = @enabled");
      params.enabled = filter.enabled ? 1 : 0;
    }

    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private findCapability(providerId: string, capabilityCode: ProviderCapability): ProviderCapabilityRecord | undefined {
    return this.database
      .prepare("SELECT * FROM provider_capability WHERE provider_id = ? AND capability_code = ?")
      .get(providerId, capabilityCode) as ProviderCapabilityRecord | undefined;
  }
}
