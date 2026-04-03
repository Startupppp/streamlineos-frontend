"server-only";

import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface InvoiceFilters {
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  clientId?: number;
  page?: number;
  limit?: number;
}

export async function getInvoices(orgId: string, filters?: InvoiceFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(invoices.orgId, orgId)];
  if (filters?.status) conditions.push(eq(invoices.status, filters.status));
  if (filters?.clientId)
    conditions.push(eq(invoices.clientId, filters.clientId));

  const [items, [countResult]] = await Promise.all([
    db.query.invoices.findMany({
      where: and(...conditions),
      orderBy: [desc(invoices.createdAt)],
      limit,
      offset,
      with: {
        client: { columns: { id: true, name: true } },
        project: { columns: { id: true, name: true } },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getInvoice(orgId: string, id: number) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.orgId, orgId)),
    with: {
      client: true,
      project: { columns: { id: true, name: true } },
      creator: { columns: { id: true, name: true } },
    },
  });
}

export async function getInvoiceStats(orgId: string) {
  const results = await db
    .select({
      status: invoices.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`COALESCE(sum(${invoices.total}::numeric), 0)::float`,
    })
    .from(invoices)
    .where(eq(invoices.orgId, orgId))
    .groupBy(invoices.status);

  const stats = {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    totalOutstanding: 0,
    totalPaid: 0,
  };
  for (const r of results) {
    const s = r.status.toLowerCase() as keyof typeof stats;
    if (s in stats) (stats as Record<string, number>)[s] = r.count;
    if (r.status === "SENT" || r.status === "OVERDUE")
      stats.totalOutstanding += r.total;
    if (r.status === "PAID") stats.totalPaid += r.total;
  }
  return stats;
}
