import type { AppDatabase } from "../database.js";
import { nowIso } from "../id.js";
import type { CountryCatalogRecord, PlatformCatalogRecord } from "../types.js";

export type CatalogEntryInput = {
  code: string;
  name: string;
};

export type CatalogListFilter = {
  enabled?: boolean;
};

export class CatalogRepository {
  constructor(private readonly database: AppDatabase) {}

  upsertPlatforms(entries: CatalogEntryInput[]): number {
    return this.upsert("platform_catalog", entries);
  }

  upsertCountries(entries: CatalogEntryInput[]): number {
    return this.upsert("country_catalog", entries);
  }

  listPlatforms(filter: CatalogListFilter = {}): PlatformCatalogRecord[] {
    return this.list("platform_catalog", filter) as PlatformCatalogRecord[];
  }

  listCountries(filter: CatalogListFilter = {}): CountryCatalogRecord[] {
    return this.list("country_catalog", filter) as CountryCatalogRecord[];
  }

  findPlatform(code: string): PlatformCatalogRecord | undefined {
    return this.database.prepare("SELECT * FROM platform_catalog WHERE code = ?").get(code) as PlatformCatalogRecord | undefined;
  }

  findCountry(code: string): CountryCatalogRecord | undefined {
    return this.database.prepare("SELECT * FROM country_catalog WHERE code = ?").get(code) as CountryCatalogRecord | undefined;
  }

  private upsert(tableName: string, entries: CatalogEntryInput[]): number {
    const now = nowIso();
    const statement = this.database.prepare(
      `INSERT INTO ${tableName} (code, name, enabled, created_at, updated_at)
       VALUES (@code, @name, 1, @now, @now)
       ON CONFLICT(code) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
    );

    const transaction = this.database.transaction((rows: CatalogEntryInput[]) => {
      let count = 0;
      for (const row of rows) {
        const code = row.code.trim();
        const name = row.name.trim();
        if (!code || !name) {
          continue;
        }
        statement.run({ code, name, now });
        count += 1;
      }
      return count;
    });

    return transaction(entries) as number;
  }

  private list(tableName: string, filter: CatalogListFilter): Array<PlatformCatalogRecord | CountryCatalogRecord> {
    if (filter.enabled === undefined) {
      return this.database.prepare(`SELECT * FROM ${tableName} ORDER BY name`).all() as Array<PlatformCatalogRecord | CountryCatalogRecord>;
    }
    return this.database
      .prepare(`SELECT * FROM ${tableName} WHERE enabled = ? ORDER BY name`)
      .all(filter.enabled ? 1 : 0) as Array<PlatformCatalogRecord | CountryCatalogRecord>;
  }
}
