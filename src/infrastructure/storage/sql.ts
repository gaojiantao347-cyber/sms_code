import type { AppDatabase } from "./database.js";

type SqlValue = string | number | null | undefined;

export function updateById(
  database: AppDatabase,
  tableName: string,
  id: string,
  changes: Record<string, SqlValue>
): boolean {
  const entries = Object.entries(changes).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return false;
  }

  const assignments = entries.map(([key]) => `${key} = @${key}`).join(", ");
  const statement = database.prepare(`UPDATE ${tableName} SET ${assignments} WHERE id = @id`);
  const result = statement.run({ id, ...Object.fromEntries(entries) });

  return result.changes > 0;
}
