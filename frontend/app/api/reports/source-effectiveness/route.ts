

import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export interface SourceEffectivenessRow {
  source: string;
  total: number;
  hired: number;
  rejected: number;
  hireRate: number;
}

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const key = `reports:source-effectiveness:${orgId}`;
    const data = await cached(
      key,
      async () => {
        const rows = await db
          .select({
            source: sql<string>`COALESCE(${candidates.source}, 'DIRECT')`,
            total: sql<number>`COUNT(*)::int`,
            hired: sql<number>`COUNT(*) FILTER (WHERE ${candidates.status} = 'HIRED')::int`,
            rejected: sql<number>`COUNT(*) FILTER (WHERE ${candidates.status} = 'REJECTED')::int`,
          })
          .from(candidates)
          .where(eq(candidates.orgId, orgId))
          .groupBy(sql`COALESCE(${candidates.source}, 'DIRECT')`)
          .orderBy(sql`COUNT(*) DESC`);

        const result: SourceEffectivenessRow[] = rows.map((r) => ({
          source: r.source,
          total: r.total,
          hired: r.hired,
          rejected: r.rejected,
          hireRate: r.total > 0 ? Math.round((r.hired / r.total) * 100) : 0,
        }));
        return result;
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );
    return ok(data);
  });
}
