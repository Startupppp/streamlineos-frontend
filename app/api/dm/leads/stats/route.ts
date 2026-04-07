import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

/** GET /api/dm/leads/stats — DM lead aggregations */
export async function GET() {
  return withAuth(async (session) => {
    const byStatus = await db
      .select({ status: leads.status, cnt: count() })
      .from(leads)
      .where(and(eq(leads.orgId, session.orgId), sql`${leads.source} = 'social_media'`))
      .groupBy(leads.status);

    const total = byStatus.reduce((s, r) => s + r.cnt, 0);
    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.cnt]));

    return ok({
      total,
      byStatus: statusMap,
      converted: statusMap.CONVERTED ?? 0,
      lost: statusMap.LOST ?? 0,
    });
  });
}
