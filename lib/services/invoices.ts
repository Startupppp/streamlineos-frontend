import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { invoices, invoiceItems, organizations } from "@/lib/db/schema";
import { indianStates } from "@/lib/db/schema/accounting";
import { splitTaxPool } from "@/lib/accounting/posting-rules";
import { postInvoiceSend } from "@/lib/accounting/post-invoice";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const legacyLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1).max(999999),
  rate: z.number().positive().max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

const itemSchema = z.object({
  description: z.string().min(1),
  hsnSacCode: z.string().optional(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  gstRate: z.number().refine((v) => [0, 5, 12, 18, 28].includes(v), { message: "gstRate must be 0/5/12/18/28" }),
});

export const createInvoiceSchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  lineItems: z.array(legacyLineItemSchema).min(1).optional(),
  items: z.array(itemSchema).min(1).optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  currency: z.string().default("INR"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
  placeOfSupply: z.string().regex(/^\d{2}$/).optional(),
  customerGstin: z.string().regex(GSTIN_REGEX).optional(),
  supplierGstin: z.string().regex(GSTIN_REGEX).optional(),
  reverseCharge: z.boolean().optional(),
  taxInclusive: z.boolean().optional(),
}).refine((v) => Boolean(v.items?.length || v.lineItems?.length), {
  message: "Either items or lineItems must be provided",
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const listInvoicesSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function resolveSupplierStateCode(orgId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { address: true },
  });
  const stateName = org?.address?.state;
  if (!stateName) return "";
  const match = await db
    .select({ stateCode: indianStates.stateCode })
    .from(indianStates)
    .where(eq(indianStates.stateName, stateName))
    .limit(1);
  return match[0]?.stateCode ?? "";
}

export interface CreateInvoiceResult {
  invoice: typeof invoices.$inferSelect;
  posted: boolean;
}

export async function createInvoice(
  orgId: string,
  userId: string,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const status = input.status;

  const normalizedItems = input.items ?? (input.lineItems ?? []).map((li) => ({
    description: li.description,
    hsnSacCode: undefined as string | undefined,
    quantity: li.quantity,
    rate: li.rate,
    gstRate: 0,
  }));

  const itemsWithAmounts = normalizedItems.map((it, idx) => {
    const amount = round2(it.quantity * it.rate);
    const tax = round2(amount * (it.gstRate / 100));
    return { ...it, amount, tax, lineOrder: idx };
  });

  const subtotal = round2(itemsWithAmounts.reduce((acc, it) => acc + it.amount, 0));
  const taxPool = round2(itemsWithAmounts.reduce((acc, it) => acc + it.tax, 0));
  const discount = round2(input.discount);
  const total = round2(subtotal + taxPool - discount);

  const supplierStateCode = await resolveSupplierStateCode(orgId);
  const placeOfSupplyStateCode = input.placeOfSupply ?? supplierStateCode;
  const split = splitTaxPool(taxPool, { supplierStateCode, placeOfSupplyStateCode });

  const legacyLineItemsMirror = itemsWithAmounts.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    rate: it.rate,
    amount: it.amount,
  }));

  if (status === "SENT") {
    await seedChartOfAccountsForOrg(orgId);
  }

  const invoice = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`,
    );

    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.orgId, orgId));
    const nextNum = (countResult?.count ?? 0) + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

    const [inserted] = await tx
      .insert(invoices)
      .values({
        orgId,
        clientId: input.clientId,
        projectId: input.projectId,
        invoiceNumber,
        status,
        lineItems: legacyLineItemsMirror,
        subtotal: subtotal.toFixed(2),
        taxRate: "0",
        taxAmount: taxPool.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        currency: input.currency,
        dueDate: input.dueDate,
        notes: input.notes,
        placeOfSupply: placeOfSupplyStateCode || null,
        customerGstin: input.customerGstin ?? null,
        supplierGstin: input.supplierGstin ?? null,
        reverseCharge: input.reverseCharge ?? false,
        taxInclusive: input.taxInclusive ?? false,
        cgstAmount: split.cgst.toFixed(4),
        sgstAmount: split.sgst.toFixed(4),
        igstAmount: split.igst.toFixed(4),
        sentAt: status === "SENT" ? new Date() : null,
        createdBy: userId,
      })
      .returning();

    if (!inserted) throw new Error("Invoice insert returned no rows");

    if (itemsWithAmounts.length > 0) {
      await tx.insert(invoiceItems).values(
        itemsWithAmounts.map((it) => ({
          invoiceId: inserted.id,
          description: it.description,
          hsnSacCode: it.hsnSacCode ?? null,
          quantity: it.quantity.toFixed(4),
          rate: it.rate.toFixed(4),
          gstRate: it.gstRate.toFixed(2),
          amount: it.amount.toFixed(4),
          lineOrder: it.lineOrder,
        })),
      );
    }

    if (status === "SENT") {
      const today = new Date().toISOString().slice(0, 10);
      await postInvoiceSend({
        orgId,
        invoiceId: inserted.id,
        invoiceNumber: inserted.invoiceNumber,
        invoiceDate: today,
        supplierStateCode,
        placeOfSupplyStateCode,
        subtotal,
        discount,
        taxPool,
        total,
        createdBy: userId,
      }, tx);
    }

    return inserted;
  });

  return { invoice, posted: status === "SENT" };
}
