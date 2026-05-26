import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { TicketPriority, TicketStatus } from "@/types/hr";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendHelpdeskTicketEmail } from "@/lib/email";

const createTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
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
        attachmentUrl: body.attachmentUrl?.trim() || null,
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
