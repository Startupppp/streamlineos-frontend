import "server-only";

import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/accounting/persist-entry";
import { serverApiClient } from "@/lib/api/server-client";
import type { Invoice, InvoiceStats, Payment } from "@/types/invoice";

export interface InvoiceFilters {
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  clientId?: number;
  page?: number;
  limit?: number;
}

interface InvoicesListResponse {
  items: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getInvoices(
  orgId: string,
  filters?: InvoiceFilters,
): Promise<InvoicesListResponse> {
  return serverApiClient.get<InvoicesListResponse>("/invoices", {
    status: filters?.status,
    clientId: filters?.clientId,
    page: filters?.page,
    limit: filters?.limit,
  });
}

export async function getInvoice(orgId: string, id: number): Promise<Invoice> {
  return serverApiClient.get<Invoice>(`/invoices/${id}`);
}

export async function getInvoicePayments(
  orgId: string,
  invoiceId: number,
): Promise<Payment[]> {
  return serverApiClient.get<Payment[]>(`/invoices/${invoiceId}/payments`);
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

export async function getInvoiceStats(orgId: string): Promise<InvoiceStats> {
  return serverApiClient.get<InvoiceStats>("/invoices/stats");
}
