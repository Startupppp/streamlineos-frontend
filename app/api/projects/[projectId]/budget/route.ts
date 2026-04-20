import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, timesheets } from "@/lib/db/schema";
import { eq, and, sum } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  budget: z.number().min(0),
});

type RouteContext = { params: Promise<{ projectId: string }> };


export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true, budget: true },
    });
    if (!project) return err("Project not found", 404);

    const members = await db.query.projectMembers.findMany({
      where: eq(projectMembers.projectId, projectId),
      columns: { userId: true, hourlyRate: true },
    });

    const memberRates = new Map(
      members.map((m) => [m.userId, Number(m.hourlyRate ?? 0)]),
    );

    const [{ value: totalHours }] = await db
      .select({ value: sum(timesheets.hours) })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.orgId, session.orgId),
          eq(timesheets.isBillable, true),
        ),
      );

    const memberCosts: { userId: string; hours: number; cost: number }[] = [];
    for (const [userId, rate] of memberRates) {
      const [{ value: hrs }] = await db
        .select({ value: sum(timesheets.hours) })
        .from(timesheets)
        .where(
          and(
            eq(timesheets.orgId, session.orgId),
            eq(timesheets.userId, userId),
            eq(timesheets.isBillable, true),
          ),
        );
      const hours = Number(hrs ?? 0);
      memberCosts.push({ userId, hours, cost: hours * rate });
    }

    const actualCost = memberCosts.reduce((acc, m) => acc + m.cost, 0);
    const plannedBudget = Number(project.budget ?? 0);

    return ok({
      projectId,
      plannedBudget,
      actualCost,
      remaining: plannedBudget - actualCost,
      utilizationPct: plannedBudget > 0 ? Math.round((actualCost / plannedBudget) * 100) : 0,
      totalHours: Number(totalHours ?? 0),
      memberBreakdown: memberCosts,
    });
  });
}


export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const input = await parseBody(req, updateSchema);
    

    const [updated] = await db
      .update(projects)
      .set({ budget: String(input.budget) })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)))
      .returning({ id: projects.id, budget: projects.budget });

    if (!updated) return err("Project not found", 404);
    return ok(updated);
  });
}
