import { type NextRequest } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets, gitTicketLinks } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: projectIdStr, ticketId: ticketIdStr } = await ctx.params;
    const projectId = Number(projectIdStr);
    const ticketId = Number(ticketIdStr);
    if (!Number.isFinite(projectId) || !Number.isFinite(ticketId)) {
      return err("Invalid identifier", 400);
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const links = await db
      .select({
        id: gitTicketLinks.id,
        provider: gitTicketLinks.provider,
        refType: gitTicketLinks.refType,
        externalId: gitTicketLinks.externalId,
        title: gitTicketLinks.title,
        url: gitTicketLinks.url,
        author: gitTicketLinks.author,
        status: gitTicketLinks.status,
        createdAt: gitTicketLinks.createdAt,
      })
      .from(gitTicketLinks)
      .where(and(eq(gitTicketLinks.ticketId, ticketId), eq(gitTicketLinks.orgId, session.orgId)))
      .orderBy(desc(gitTicketLinks.createdAt));

    return ok(links);
  });
}
