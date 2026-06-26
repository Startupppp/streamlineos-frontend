import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals, okrKeyResults, okrUpdates, okrLinks, tickets, projects, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  ownerId: z.string().nullable().optional(),
  level: z.enum(["company", "team", "individual"]).optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  parentGoalId: z.number().int().nullable().optional(),
  projectId: z.number().int().nullable().optional(),
});

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const goal = await db.query.okrGoals.findFirst({
      where: and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)),
      with: {
        owner: { columns: { id: true, name: true, email: true, image: true } },
        project: { columns: { id: true, name: true, key: true } },
      },
    });
    if (!goal) return err("Goal not found", 404);

    const keyResults = await db.query.okrKeyResults.findMany({
      where: and(eq(okrKeyResults.goalId, goalId), eq(okrKeyResults.orgId, session.orgId)),
      orderBy: [okrKeyResults.id],
    });

    const updates = await db
      .select({
        id: okrUpdates.id,
        keyResultId: okrUpdates.keyResultId,
        note: okrUpdates.note,
        previousValue: okrUpdates.previousValue,
        newValue: okrUpdates.newValue,
        createdAt: okrUpdates.createdAt,
        userId: okrUpdates.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(okrUpdates)
      .leftJoin(users, eq(okrUpdates.userId, users.id))
      .where(and(eq(okrUpdates.goalId, goalId), eq(okrUpdates.orgId, session.orgId)))
      .orderBy(desc(okrUpdates.createdAt))
      .limit(20);

    const links = await db
      .select({
        id: okrLinks.id,
        ticketId: okrLinks.ticketId,
        projectId: okrLinks.projectId,
        createdAt: okrLinks.createdAt,
        ticketTitle: tickets.title,
        ticketProjectId: tickets.projectId,
        projectName: projects.name,
        projectKey: projects.key,
      })
      .from(okrLinks)
      .leftJoin(tickets, eq(okrLinks.ticketId, tickets.id))
      .leftJoin(projects, eq(okrLinks.projectId, projects.id))
      .where(and(eq(okrLinks.goalId, goalId), eq(okrLinks.orgId, session.orgId)))
      .orderBy(desc(okrLinks.createdAt));

    return ok({ ...goal, keyResults, updates, links });
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(okrGoals)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Goal not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const [deleted] = await db
      .delete(okrGoals)
      .where(and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Goal not found", 404);
    return ok({ success: true });
  });
}
