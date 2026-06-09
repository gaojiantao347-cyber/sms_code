import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { schemaSql } from "./schema.js";

export type AppDatabase = Database.Database;

export function createDatabase(databasePath: string): AppDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.exec(schemaSql);
  migrateDatabase(database);

  return database;
}

function migrateDatabase(database: AppDatabase): void {
  const columns = database.prepare("PRAGMA table_info(redeem_code)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "code_encrypted")) {
    database.exec("ALTER TABLE redeem_code ADD COLUMN code_encrypted text");
  }
  if (!columns.some((column) => column.name === "operator")) {
    database.exec("ALTER TABLE redeem_code ADD COLUMN operator text");
  }
  if (!columns.some((column) => column.name === "max_price")) {
    database.exec("ALTER TABLE redeem_code ADD COLUMN max_price text");
  }
}
