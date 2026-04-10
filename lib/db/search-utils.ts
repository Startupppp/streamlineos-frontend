import { ilike } from "drizzle-orm";
import type { Column } from "drizzle-orm";

export function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export function safeIlike(column: Column, search: string) {
  return ilike(column, `%${escapeLikePattern(search.trim())}%`);
}
