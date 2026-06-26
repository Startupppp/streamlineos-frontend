import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals, okrLinks, tickets, projects } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z
  .object({
    ticketId: z.number().int().optional(),
    projectId: z.number().int().optional(),
  })
  .refine((data) => data.ticketId !== undefined || data.projectId !== undefined, {
    message: "Provide a ticketId or projectId",
  });

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

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

    return ok(links);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const goal = await db.query.okrGoals.findFirst({
      where: and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!goal) return err("Goal not found", 404);

    const input = await parseBody(req, createSchema);

    if (input.ticketId !== undefined) {
      const ticket = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.ticketId), eq(tickets.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!ticket) return err("Ticket not found", 404);
    }

    if (input.projectId !== undefined) {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!project) return err("Project not found", 404);
    }

    const [link] = await db
      .insert(okrLinks)
      .values({
        orgId: session.orgId,
        goalId,
        ticketId: input.ticketId ?? null,
        projectId: input.projectId ?? null,
      })
      .returning();

    return ok(link, 201);
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const linkIdStr = req.nextUrl.searchParams.get("linkId");
    const linkId = Number(linkIdStr);
    if (!linkIdStr || !Number.isFinite(linkId)) return err("Invalid link ID", 400);

    const [deleted] = await db
      .delete(okrLinks)
      .where(and(eq(okrLinks.id, linkId), eq(okrLinks.goalId, goalId), eq(okrLinks.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Link not found", 404);
    return ok({ success: true });
  });
}
