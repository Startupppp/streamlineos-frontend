import { ilike } from "drizzle-orm";
import type { Column } from "drizzle-orm";

/**
 * Escape SQL LIKE/ILIKE wildcard characters to prevent unintended pattern matching.
 * Without this, searching for "%" or "_" would match all records.
 */
export function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

/**
 * Build a case-insensitive LIKE condition with properly escaped wildcards.
 */
export function safeIlike(column: Column, search: string) {
  return ilike(column, `%${escapeLikePattern(search.trim())}%`);
}
