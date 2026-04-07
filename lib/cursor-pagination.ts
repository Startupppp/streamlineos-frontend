import { z } from "zod";

// ─── Schema ────────────────────────────────────────────────────────────────────

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

// ─── Response type ─────────────────────────────────────────────────────────────

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Cursor encoding/decoding ─────────────────────────────────────────────────

/**
 * Encode an (id, createdAt) pair into a base64 opaque cursor string.
 */
export function encodeCursor(id: number, createdAt: Date): string {
  const payload = JSON.stringify({ id, createdAt: createdAt.toISOString() });
  return Buffer.from(payload).toString("base64url");
}

/**
 * Decode a cursor string back to { id, createdAt }.
 * Returns null if the cursor is invalid/malformed.
 */
export function decodeCursor(cursor: string): { id: number; createdAt: Date } | null {
  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof payload.id !== "number" || !payload.createdAt) return null;
    return { id: payload.id, createdAt: new Date(payload.createdAt) };
  } catch {
    return null;
  }
}

// ─── Helper to build paginated response ──────────────────────────────────────

/**
 * Given a raw array (fetched with limit+1), build the paginated response.
 * The `getCursor` function extracts the cursor fields from each item.
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  getCursor: (item: T) => { id: number; createdAt: Date }
): CursorPaginatedResponse<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem ? encodeCursor(...Object.values(getCursor(lastItem)) as [number, Date]) : null;

  return { items, nextCursor, hasMore };
}
