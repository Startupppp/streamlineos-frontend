import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, sprints, tickets, customStates } from "@/lib/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { differenceInCalendarDays, addDays } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";

type RouteContext = { params: Promise<{ projectId: string }> };

const querySchema = z.object({
  sprintId: z.string().regex(/^\d+$/).optional(),
});

interface BurnupPoint {
  date: string;
  scope: number;
  completed: number;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const { sprintId: sprintIdStr } = parseQuery(req, querySchema);

    const sprint = sprintIdStr
      ? await db.query.sprints.findFirst({
          where: and(
            eq(sprints.id, Number(sprintIdStr)),
            eq(sprints.projectId, projectId),
            eq(sprints.orgId, session.orgId),
          ),
          columns: { id: true, startDate: true, endDate: true },
        })
      : await db.query.sprints.findFirst({
          where: and(
            eq(sprints.projectId, projectId),
            eq(sprints.orgId, session.orgId),
            inArray(sprints.status, ["ACTIVE", "COMPLETED"]),
          ),
          orderBy: [desc(sprints.startDate)],
          columns: { id: true, startDate: true, endDate: true },
        });

    if (!sprint) return ok<BurnupPoint[]>([]);

    const sprintTickets = await db
      .select({
        storyPoints: tickets.storyPoints,
        updatedAt: tickets.updatedAt,
        group: customStates.group,
      })
      .from(tickets)
      .leftJoin(customStates, eq(tickets.stateId, customStates.id))
      .where(and(eq(tickets.orgId, session.orgId), eq(tickets.sprintId, sprint.id)))
      .orderBy(asc(tickets.updatedAt));

    const totalScope = sprintTickets.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

    const completedByDate = new Map<string, number>();
    for (const t of sprintTickets) {
      if (t.group !== "completed") continue;
      const dateKey = formatDateOnly(t.updatedAt);
      completedByDate.set(dateKey, (completedByDate.get(dateKey) ?? 0) + (t.storyPoints ?? 0));
    }

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const days = Math.max(differenceInCalendarDays(endDate, startDate) + 1, 1);

    let cumulativeCompleted = 0;
    const series: BurnupPoint[] = Array.from({ length: days }).map((_, i) => {
      const day = addDays(startDate, i);
      const dateKey = formatDateOnly(day);
      cumulativeCompleted += completedByDate.get(dateKey) ?? 0;
      return {
        date: dateKey,
        scope: totalScope,
        completed: Math.min(cumulativeCompleted, totalScope),
      };
    });

    return ok(series);
  });
}
