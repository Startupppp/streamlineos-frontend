import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendHelpdeskTicketEmail } from "@/lib/email";

const listSchema = z.object({
  userId: z.string().min(1).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
});

const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Ticket title must be at least 5 characters")
    .max(150, "Ticket title must be at most 150 characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), "Ticket title must contain at least one letter or digit")
    .refine((v) => !/\s{2,}/.test(v), "Ticket title cannot have multiple consecutive spaces"),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(10, "Description must be at least 10 characters").max(2000, "Description must be at most 2000 characters").optional()
  ),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId: filterUserId, status } = parseQuery(req, listSchema);
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:employees");

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' tickets.", 403);
    }

    const data = await getHelpdeskTickets(
      session.orgId,
      session.user.id,
      isAdmin,
      { filterUserId, status },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createTicketSchema);

    const existing = await db.query.helpdeskTickets.findFirst({
      where: and(
        eq(helpdeskTickets.orgId, session.orgId),
        eq(helpdeskTickets.userId, session.user.id),
        sql`lower(trim(${helpdeskTickets.title})) = ${body.title.trim().toLowerCase()}`,
      ),
      columns: { id: true },
    });

    if (existing) {
      return err("A ticket with this title already exists.", 409);
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

    void (async () => {
      const hrMemberIds = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

      if (hrMemberIds.length > 0) {
        const hrUsers = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(inArray(users.id, hrMemberIds.map((m) => m.userId)));

        await Promise.all(
          hrUsers
            .filter((u) => u.email)
            .map((u) =>
              sendHelpdeskTicketEmail(
                u.email!,
                u.name ?? "HR",
                body.title,
                body.category ?? "General",
                body.priority ?? "MEDIUM",
                session.user.name ?? "Employee"
              )
            )
        );
      }
    })().catch(() => {});

    return ok(ticket, 201);
  });
}
