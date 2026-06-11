

import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { timesheets, tickets, projects } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const ability = await getSessionAbility();
    const isAdmin = ability.can("manage", "projects");
    const orgId = session.orgId!;
    const userId = session.user.id;

    const key = `projects:billing-summary:${orgId}:${userId}:${isAdmin ? "all" : "self"}:${startDate ?? ""}:${endDate ?? ""}`;
    const result = await cached(
      key,
      async () => {
        const conditions = [
          eq(timesheets.orgId, orgId),
          eq(timesheets.isBillable, true),
        ];
        if (!isAdmin) conditions.push(eq(timesheets.userId, userId));
        if (startDate) conditions.push(gte(timesheets.date, startDate));
        if (endDate) conditions.push(lte(timesheets.date, endDate));

        return db
          .select({
            projectId: tickets.projectId,
            projectName: projects.name,
            totalHours: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
          })
          .from(timesheets)
          .innerJoin(tickets, eq(timesheets.ticketId, tickets.id))
          .innerJoin(projects, eq(tickets.projectId, projects.id))
          .where(and(...conditions))
          .groupBy(tickets.projectId, projects.name);
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(result);
  });
}
