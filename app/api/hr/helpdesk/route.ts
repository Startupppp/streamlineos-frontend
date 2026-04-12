import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { TicketPriority, TicketStatus } from "@/types/hr";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createTicketSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const status = searchParams.get("status") as TicketStatus | null;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' tickets.", 403);
    }

    const data = await getHelpdeskTickets(
      session.orgId,
      session.user.id,
      isAdmin,
      {
        filterUserId,
        status: status ?? undefined,
      }
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createTicketSchema);

    const [ticket] = await db
      .insert(helpdeskTickets)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority || "MEDIUM",
        status: "TODO",
      })
      .returning();

    return ok(ticket);
  });
}
