import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, sprints, tickets, customStates } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string }> };

interface VelocitySprint {
  sprintId: number;
  name: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  committedCount: number;
  completedCount: number;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const projectSprints = await db
      .select({
        id: sprints.id,
        name: sprints.name,
        startDate: sprints.startDate,
        endDate: sprints.endDate,
        status: sprints.status,
      })
      .from(sprints)
      .where(
        and(
          eq(sprints.projectId, projectId),
          eq(sprints.orgId, session.orgId),
          inArray(sprints.status, ["ACTIVE", "COMPLETED"]),
        ),
      )
      .orderBy(asc(sprints.startDate));

    if (projectSprints.length === 0) return ok<VelocitySprint[]>([]);

    const sprintIds = projectSprints.map((s) => s.id);

    const sprintTickets = await db
      .select({
        sprintId: tickets.sprintId,
        storyPoints: tickets.storyPoints,
        group: customStates.group,
      })
      .from(tickets)
      .leftJoin(customStates, eq(tickets.stateId, customStates.id))
      .where(
        and(
          eq(tickets.orgId, session.orgId),
          inArray(tickets.sprintId, sprintIds),
        ),
      );

    const bySprint = new Map<number, { committedPoints: number; completedPoints: number; committedCount: number; completedCount: number }>();
    for (const id of sprintIds) {
      bySprint.set(id, { committedPoints: 0, completedPoints: 0, committedCount: 0, completedCount: 0 });
    }

    for (const t of sprintTickets) {
      if (t.sprintId === null) continue;
      const bucket = bySprint.get(t.sprintId);
      if (!bucket) continue;
      const pts = t.storyPoints ?? 0;
      bucket.committedPoints += pts;
      bucket.committedCount += 1;
      if (t.group === "completed") {
        bucket.completedPoints += pts;
        bucket.completedCount += 1;
      }
    }

    const result: VelocitySprint[] = projectSprints.map((s) => {
      const bucket = bySprint.get(s.id)!;
      return {
        sprintId: s.id,
        name: s.name,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        committedPoints: bucket.committedPoints,
        completedPoints: bucket.completedPoints,
        committedCount: bucket.committedCount,
        completedCount: bucket.completedCount,
      };
    });

    return ok(result);
  });
}
