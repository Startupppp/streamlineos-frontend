import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { TicketPriority, TicketStatus } from "@/types/hr";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendHelpdeskTicketEmail } from "@/lib/email";

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

    void (async () => {
      const hrMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

      for (const m of hrMembers) {
        const hrUser = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, name: true },
        });
        if (hrUser?.email) {
          await sendHelpdeskTicketEmail(
            hrUser.email,
            hrUser.name ?? "HR",
            body.title,
            body.category ?? "General",
            body.priority ?? "MEDIUM",
            session.user.name ?? "Employee"
          );
        }
      }
    })().catch(() => {});

    return ok(ticket);
  });
}
