"server-only";

import { db } from "@/lib/db";
import { supportTickets, supportTicketMessages } from "@/lib/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export interface SupportFilters {
  status?: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export async function getSupportTickets(orgId: string, filters?: SupportFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(supportTickets.orgId, orgId)];
  if (filters?.status)
    conditions.push(eq(supportTickets.status, filters.status));
  if (filters?.priority)
    conditions.push(eq(supportTickets.priority, filters.priority));
  if (filters?.assigneeId)
    conditions.push(eq(supportTickets.assigneeId, filters.assigneeId));

  const [items, [countResult]] = await Promise.all([
    db.query.supportTickets.findMany({
      where: and(...conditions),
      orderBy: [desc(supportTickets.createdAt)],
      limit,
      offset,
      with: {
        client: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true, image: true } },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getSupportTicket(orgId: string, id: number) {
  return db.query.supportTickets.findFirst({
    where: and(eq(supportTickets.id, id), eq(supportTickets.orgId, orgId)),
    with: {
      client: true,
      assignee: { columns: { id: true, name: true, image: true } },
      creator: { columns: { id: true, name: true } },
      messages: {
        with: {
          author: { columns: { id: true, name: true, image: true } },
        },
        orderBy: [asc(supportTicketMessages.createdAt)],
      },
    },
  });
}
