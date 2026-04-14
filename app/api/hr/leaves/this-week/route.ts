import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/leaves/this-week
 * Returns approved leaves overlapping the current week.
 */
export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const leaves = await db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.orgId, session.orgId),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, weekEnd.toISOString()),
        gte(leaveRequests.endDate, weekStart.toISOString()),
      ),
      with: {
        user: true,
        leaveType: { columns: { id: true, name: true } },
      },
      orderBy: [desc(leaveRequests.startDate)],
    });

    return ok(leaves);
  });
}
