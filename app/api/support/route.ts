import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getSupportTickets } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketCreatedEmail } from "@/lib/email";
import { applyRoutingRules } from "@/lib/services/support-routing";
import { logger } from "@/lib/logger";

const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type TicketPriority = (typeof TICKET_PRIORITIES)[number];

function isTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(value);
}

const SLA_HOURS: Record<string, number> = {
  LOW: 48,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 2,
};

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters")
    .refine((v) => !/\s{2,}/.test(v), "Title cannot have multiple consecutive spaces")
    .refine((v) => !/^[\W\s]+$/.test(v), "Title cannot consist of only special characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v), "Title must contain at least one letter or number")
    .refine((v) => !/[<>{}|\\^`]/.test(v), "Title contains invalid characters"),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
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

      const orgId = session.orgId;
      const key = `support:tickets:${orgId}:${status ?? ""}:${priority ?? ""}:${assigneeId ?? ""}:${page}:${limit}`;
      const data = await cached(
        key,
        () =>
          getSupportTickets(orgId, {
            status: status ?? undefined,
            priority: priority ?? undefined,
            assigneeId,
            page,
            limit,
          }),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
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

      const existing = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.orgId, session.orgId),
          sql`LOWER(${supportTickets.title}) = LOWER(${input.title})`,
        ),
        columns: { id: true },
      });
      if (existing) {
        return err("A ticket with this title already exists. Please use a different title.", 409);
      }

      const callerSetPriority = body && typeof body === "object" && "priority" in body;

      let finalPriority: TicketPriority = input.priority;
      let finalAssigneeId = input.assigneeId;

      try {
        const routing = await applyRoutingRules(session.orgId, {
          title: input.title,
          category: input.category ?? null,
          description: input.description ?? null,
          priority: input.priority,
        });
        if (routing.assigneeId && !input.assigneeId) {
          finalAssigneeId = routing.assigneeId;
        }
        if (routing.setPriority && !callerSetPriority && isTicketPriority(routing.setPriority)) {
          finalPriority = routing.setPriority;
        }
      } catch (routingError) {
        logger.error("Support routing rules failed to apply", {
          orgId: session.orgId,
          error: routingError instanceof Error ? routingError.message : String(routingError),
        });
      }

      const slaHours = SLA_HOURS[finalPriority];
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      const [ticket] = await db
        .insert(supportTickets)
        .values({
          orgId: session.orgId,
          title: input.title,
          category: input.category ?? null,
          description: input.description,
          clientId: input.clientId,
          priority: finalPriority,
          assigneeId: finalAssigneeId,
          slaDeadline,
          createdBy: session.user.id,
        })
        .returning();

      if (finalAssigneeId) {
        const notifyAssigneeId = finalAssigneeId;
        void (async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, notifyAssigneeId),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendSupportTicketCreatedEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              input.title,
              finalPriority,
              session.user.name ?? "User",
              ticket.id
            );
          }
        })().catch((emailError) => {
          logger.error("Support ticket created notification email failed", {
            ticketId: ticket.id,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
        });
      }

      await invalidateCachePattern(`support:tickets:${session.orgId}:*`);

      return ok(ticket, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create support ticket",
        500
      );
    }
  });
}
