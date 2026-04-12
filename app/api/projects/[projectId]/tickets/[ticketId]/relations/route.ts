/**
 * GET  /api/projects/[projectId]/tickets/[ticketId]/relations
 * POST /api/projects/[projectId]/tickets/[ticketId]/relations
 * DELETE /api/projects/[projectId]/tickets/[ticketId]/relations?relatedId=X
 */

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { workItemRelations, tickets, projectMembers } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const RELATION_TYPES = ["blocks", "blocked_by", "duplicate_of", "relates_to"] as const;

const addRelationSchema = z.object({
  relatedTicketId: z.number().int().positive(),
  relationType: z.enum(RELATION_TYPES),
});

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const ticketId = Number(rawTicketId);
    const projectId = Number(rawProjectId);
    if (!ticketId || !projectId) return err("Invalid IDs.", 400);

    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ),
    });
    if (!member) return err("Not a project member.", 403);

    const relations = await db.query.workItemRelations.findMany({
      where: or(
        eq(workItemRelations.workItemId, ticketId),
        eq(workItemRelations.relatedWorkItemId, ticketId)
      ),
      with: {
        workItem: { columns: { id: true, title: true, ticketNumber: true, status: true, priority: true } },
        relatedWorkItem: { columns: { id: true, title: true, ticketNumber: true, status: true, priority: true } },
      },
    });

    // Normalize so the "other" ticket is always `relatedTicket`
    const normalized = relations.map((r) => {
      const isSource = r.workItemId === ticketId;
      return {
        id: r.id,
        relationType: r.relationType,
        relatedTicket: isSource ? r.relatedWorkItem : r.workItem,
        direction: isSource ? "outgoing" : "incoming",
      };
    });

    return ok(normalized);
  });
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const ticketId = Number(rawTicketId);
    const projectId = Number(rawProjectId);
    if (!ticketId || !projectId) return err("Invalid IDs.", 400);

    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ),
    });
    if (!member) return err("Not a project member.", 403);

    const body = await parseBody(req, addRelationSchema);

    if (body.relatedTicketId === ticketId) {
      return err("A ticket cannot relate to itself.", 400);
    }

    // Verify related ticket is in same project
    const relatedTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, body.relatedTicketId), eq(tickets.projectId, projectId)),
      columns: { id: true },
    });
    if (!relatedTicket) return err("Related ticket not found in this project.", 404);

    const [created] = await db
      .insert(workItemRelations)
      .values({
        workItemId: ticketId,
        relatedWorkItemId: body.relatedTicketId,
        relationType: body.relationType,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) return err("This relation already exists.", 409);

    return ok(created, 201);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const ticketId = Number(rawTicketId);
    const projectId = Number(rawProjectId);
    if (!ticketId || !projectId) return err("Invalid IDs.", 400);

    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ),
    });
    if (!member) return err("Not a project member.", 403);

    const relatedId = Number(new URL(req.url).searchParams.get("relatedId"));
    if (!relatedId) return err("relatedId query param required.", 400);

    await db.delete(workItemRelations).where(
      or(
        and(
          eq(workItemRelations.workItemId, ticketId),
          eq(workItemRelations.relatedWorkItemId, relatedId)
        ),
        and(
          eq(workItemRelations.workItemId, relatedId),
          eq(workItemRelations.relatedWorkItemId, ticketId)
        )
      )
    );

    return ok({ success: true });
  });
}
