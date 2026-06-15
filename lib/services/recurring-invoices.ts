"server-only";

import { and, asc, eq, lte } from "drizzle-orm";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema/crm/billing";
import { createInvoice, type CreateInvoiceInput } from "@/lib/services/invoices";
import { logger } from "@/lib/logger";

const GST_RATES = [0, 5, 12, 18, 28] as const;
type GstRate = (typeof GST_RATES)[number];

export interface RecurringInvoiceRow {
  id: number;
  invoiceNumber: string;
  clientId: number | null;
  clientName: string | null;
  total: string;
  currency: string;
  status: string;
  recurringInterval: string | null;
  nextRecurringDate: string | null;
  overdue: boolean;
}

export interface GenerateRecurringResult {
  generated: number;
  invoiceIds: number[];
  failedIds: number[];
}

function toIsoDate(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function normalizeGstRate(value: string): GstRate {
  const parsed = Number(value);
  return (GST_RATES as ReadonlyArray<number>).includes(parsed) ? (parsed as GstRate) : 0;
}

function advanceDate(from: Date, interval: string | null): Date {
  switch ((interval ?? "").trim().toLowerCase()) {
    case "weekly":
    case "week":
      return addWeeks(from, 1);
    case "biweekly":
    case "fortnightly":
      return addWeeks(from, 2);
    case "daily":
    case "day":
      return addDays(from, 1);
    case "quarterly":
    case "quarter":
      return addMonths(from, 3);
    case "halfyearly":
    case "half-yearly":
    case "semiannually":
      return addMonths(from, 6);
    case "yearly":
    case "annually":
    case "year":
      return addYears(from, 1);
    default:
      return addMonths(from, 1);
  }
}

export async function listRecurring(
  orgId: string,
  asOfDate: string,
): Promise<RecurringInvoiceRow[]> {
  const rows = await db.query.invoices.findMany({
    where: and(eq(invoices.orgId, orgId), eq(invoices.isRecurring, true)),
    orderBy: [asc(invoices.nextRecurringDate)],
    columns: {
      id: true,
      invoiceNumber: true,
      clientId: true,
      total: true,
      currency: true,
      status: true,
      recurringInterval: true,
      nextRecurringDate: true,
    },
    with: {
      client: { columns: { id: true, name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    total: row.total,
    currency: row.currency,
    status: row.status,
    recurringInterval: row.recurringInterval,
    nextRecurringDate: row.nextRecurringDate,
    overdue: row.nextRecurringDate !== null && row.nextRecurringDate <= asOfDate,
  }));
}

async function buildCloneInput(sourceId: number): Promise<CreateInvoiceInput> {
  const source = await db.query.invoices.findFirst({
    where: eq(invoices.id, sourceId),
    with: {
      items: { orderBy: [asc(invoiceItems.lineOrder)] },
    },
  });

  if (!source) throw new Error(`Recurring source invoice ${sourceId} not found`);

  const items = source.items.map((item) => ({
    description: item.description,
    hsnSacCode: item.hsnSacCode ?? undefined,
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    gstRate: normalizeGstRate(item.gstRate),
  }));

  const lineItems = source.lineItems.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    rate: line.rate,
    amount: line.amount,
  }));

  return {
    clientId: source.clientId ?? undefined,
    projectId: source.projectId ?? undefined,
    items: items.length > 0 ? items : undefined,
    lineItems: items.length > 0 ? undefined : lineItems,
    taxRate: 0,
    discount: Number(source.discount ?? "0"),
    currency: source.currency,
    notes: source.notes ?? undefined,
    status: "DRAFT",
    placeOfSupply: source.placeOfSupply ?? undefined,
    customerGstin: source.customerGstin ?? undefined,
    supplierGstin: source.supplierGstin ?? undefined,
    reverseCharge: source.reverseCharge,
    taxInclusive: source.taxInclusive,
  };
}

export async function generateDueRecurringInvoices(
  orgId: string,
  userId: string,
  asOfDate: string,
): Promise<GenerateRecurringResult> {
  const dueInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.orgId, orgId),
      eq(invoices.isRecurring, true),
      lte(invoices.nextRecurringDate, asOfDate),
    ),
    columns: { id: true, recurringInterval: true, nextRecurringDate: true },
  });

  const invoiceIds: number[] = [];
  const failedIds: number[] = [];

  for (const due of dueInvoices) {
    try {
      const input = await buildCloneInput(due.id);
      const baseDate = due.nextRecurringDate ? new Date(due.nextRecurringDate) : new Date(asOfDate);
      const advanced = toIsoDate(advanceDate(baseDate, due.recurringInterval));

      const { invoice } = await createInvoice(orgId, userId, input);

      await db
        .update(invoices)
        .set({ nextRecurringDate: advanced, updatedAt: new Date() })
        .where(and(eq(invoices.id, due.id), eq(invoices.orgId, orgId)));

      invoiceIds.push(invoice.id);
    } catch (error) {
      failedIds.push(due.id);
      logger.error("Recurring invoice clone failed", {
        orgId,
        sourceInvoiceId: due.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { generated: invoiceIds.length, invoiceIds, failedIds };
}
