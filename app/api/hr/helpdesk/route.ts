import { withAuth, ok, err } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { TicketPriority, TicketStatus } from "@/types/hr";
import type { NextRequest } from "next/server";

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
    const body = await req.json() as {
      title: string;
      description?: string;
      category?: string;
      priority?: TicketPriority;
    };

    if (!body.title || body.title.trim().length === 0) {
      return err("title is required.", 400);
    }

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
