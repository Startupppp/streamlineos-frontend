"use client";

/**
 * The wire shape of every cursor-paged accounting list, and the one query
 * serializer they share.
 *
 * Both live here rather than beside any one hook because `hooks/api/accounting.ts`
 * and `hooks/api/accounting/chart-of-accounts.ts` each need them, and a type
 * parked next to runtime code drags that whole module into every importer
 * (root CLAUDE.md section 9).
 */
export interface CursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}
