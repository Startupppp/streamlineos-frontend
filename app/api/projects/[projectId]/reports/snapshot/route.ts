import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets, customStates, projectDailySnapshots } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";

type RouteContext = { params: Promise<{ projectId: string }> };

const STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;
type StateGroup = (typeof STATE_GROUPS)[number];

export async function POST(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const projectTickets = await db
      .select({
        storyPoints: tickets.storyPoints,
        group: customStates.group,
      })
      .from(tickets)
      .leftJoin(customStates, eq(tickets.stateId, customStates.id))
      .where(and(eq(tickets.orgId, session.orgId), eq(tickets.projectId, projectId)));

    const totals = new Map<StateGroup, { count: number; points: number }>();
    for (const group of STATE_GROUPS) {
      totals.set(group, { count: 0, points: 0 });
    }

    for (const t of projectTickets) {
      const group: StateGroup = t.group ?? "backlog";
      const bucket = totals.get(group);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.points += t.storyPoints ?? 0;
    }

    const snapshotDate = formatDateOnly(new Date());
    const values = STATE_GROUPS.map((group) => {
      const bucket = totals.get(group)!;
      return {
        orgId: session.orgId,
        projectId,
        snapshotDate,
        stateGroup: group,
        count: bucket.count,
        points: bucket.points,
      };
    });

    await db
      .insert(projectDailySnapshots)
      .values(values)
      .onConflictDoUpdate({
        target: [
          projectDailySnapshots.projectId,
          projectDailySnapshots.snapshotDate,
          projectDailySnapshots.stateGroup,
        ],
        set: {
          count: sql`excluded.${sql.raw(projectDailySnapshots.count.name)}`,
          points: sql`excluded.${sql.raw(projectDailySnapshots.points.name)}`,
        },
      });

    return ok({ captured: values.length });
  });
}
