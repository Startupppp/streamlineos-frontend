import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid } = await params;
    const ticketId = Number(tid);
    if (!ticketId) return err("Invalid ticket id", 400);

    const subtasks = await db.query.tickets.findMany({
      where: and(
        eq(tickets.parentTicketId, ticketId),
        eq(tickets.orgId, session.orgId!)
      ),
      with: { assignee: true },
    });

    return ok(subtasks);
  });
}
