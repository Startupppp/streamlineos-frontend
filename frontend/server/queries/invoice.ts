"server-only";

import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/accounting/persist-entry";

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
      payments: {
        orderBy: [desc(payments.paymentDate)],
        with: { creator: { columns: { id: true, name: true } } },
      },
    },
  });
}

export async function getInvoicePayments(orgId: string, invoiceId: number) {
  return db.query.payments.findMany({
    where: and(eq(payments.invoiceId, invoiceId), eq(payments.orgId, orgId)),
    orderBy: [desc(payments.paymentDate)],
    with: { creator: { columns: { id: true, name: true } } },
  });
}

export async function createPayment(
  orgId: string,
  invoiceId: number,
  data: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    createdBy: string;
  },
  outerTx?: DbOrTx
) {
  async function run(tx: DbOrTx) {
    const [payment] = await tx.insert(payments).values({
      orgId,
      invoiceId,
      amount: data.amount.toFixed(2),
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      createdBy: data.createdBy,
    }).returning();

    const [{ totalPaid }] = await tx
      .select({ totalPaid: sql<number>`COALESCE(sum(amount::numeric), 0)::float` })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));

    const invoice = await tx.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      columns: { total: true, status: true },
    });

    if (invoice && Number(invoice.total) <= totalPaid && invoice.status !== "PAID") {
      await tx.update(invoices).set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    }

    return payment;
  }

  if (outerTx) {
    return run(outerTx);
  }
  return db.transaction(async (tx) => run(tx));
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
