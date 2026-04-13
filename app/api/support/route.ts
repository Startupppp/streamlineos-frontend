import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getSupportTickets } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketCreatedEmail } from "@/lib/email";

const SLA_HOURS: Record<string, number> = {
  LOW: 48,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 2,
};

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  clientId: z.number().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED"
        | null;
      const priority = params.get("priority") as
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "URGENT"
        | null;
      const assigneeId = params.get("assigneeId") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 50;

      const data = await getSupportTickets(session.orgId, {
        status: status ?? undefined,
        priority: priority ?? undefined,
        assigneeId,
        page,
        limit,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load support tickets",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      const slaHours = SLA_HOURS[input.priority];
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      const [ticket] = await db
        .insert(supportTickets)
        .values({
          orgId: session.orgId,
          title: input.title,
          description: input.description,
          clientId: input.clientId,
          priority: input.priority,
          assigneeId: input.assigneeId,
          slaDeadline,
          createdBy: session.user.id,
        })
        .returning();

      // Email the assignee if one was set (non-blocking)
      if (input.assigneeId) {
        void (async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, input.assigneeId!),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendSupportTicketCreatedEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              input.title,
              input.priority,
              session.user.name ?? "User",
              ticket.id
            );
          }
        })().catch(() => {});
      }

      return ok(ticket, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create support ticket",
        500
      );
    }
  });
}
