/**
 * GET    /api/projects/[projectId]/tickets/[ticketId]/watchers — list watchers
 * POST   /api/projects/[projectId]/tickets/[ticketId]/watchers — add watcher (self or userId)
 * DELETE /api/projects/[projectId]/tickets/[ticketId]/watchers — remove self as watcher
 */

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketWatchers, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string }>;
};

async function resolveTicketId(params: RouteParams["params"]) {
  const { ticketId: tid } = await params;
  return Number(tid);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const ticketId = await resolveTicketId(params);
    if (!ticketId) return err("Invalid ticket id", 400);

    // Verify ticket belongs to org
    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const watchers = await db.query.ticketWatchers.findMany({
      where: eq(ticketWatchers.ticketId, ticketId),
      with: { user: true },
    });

    return ok(watchers);
  });
}

const addWatcherSchema = z.object({
  userId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const ticketId = await resolveTicketId(params);
    if (!ticketId) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const body = await parseBody(req, addWatcherSchema);
    const userId = body.userId ?? session.user.id;

    // Upsert — ignore conflict
    await db
      .insert(ticketWatchers)
      .values({ ticketId, userId })
      .onConflictDoNothing();

    return ok({ success: true }, 201);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const ticketId = await resolveTicketId(params);
    if (!ticketId) return err("Invalid ticket id", 400);

    await db
      .delete(ticketWatchers)
      .where(
        and(
          eq(ticketWatchers.ticketId, ticketId),
          eq(ticketWatchers.userId, session.user.id)
        )
      );

    return ok({ success: true });
  });
}
