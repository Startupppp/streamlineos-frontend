import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { eq, and, count, lt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const now = new Date();

    const [statusAggs, slaBreached] = await Promise.all([
      db
        .select({ status: supportTickets.status, cnt: count() })
        .from(supportTickets)
        .where(eq(supportTickets.orgId, orgId))
        .groupBy(supportTickets.status),

      db
        .select({ cnt: count() })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.orgId, orgId),
            sql`${supportTickets.slaDeadline} IS NOT NULL`,
            lt(supportTickets.slaDeadline, now),
            sql`${supportTickets.status} NOT IN ('RESOLVED', 'CLOSED')`,
          ),
        ),
    ]);

    const statusMap = new Map(statusAggs.map((r) => [r.status, Number(r.cnt)]));

    return ok({
      open: statusMap.get("OPEN") ?? 0,
      in_progress: statusMap.get("IN_PROGRESS") ?? 0,
      waiting: statusMap.get("WAITING") ?? 0,
      resolved: statusMap.get("RESOLVED") ?? 0,
      closed: statusMap.get("CLOSED") ?? 0,
      sla_breached: Number(slaBreached[0]?.cnt ?? 0),
    });
  });
}
