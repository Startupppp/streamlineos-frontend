import { isNull, SQL, and } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function notDeleted<T extends { deletedAt: PgColumn }>(table: T): SQL {
  return isNull(table.deletedAt);
}

export function withNotDeleted<T extends { deletedAt: PgColumn }>(
  table: T,
  condition?: SQL
): SQL {
  if (condition) {
    return and(isNull(table.deletedAt), condition)!;
  }
  return isNull(table.deletedAt);
}
