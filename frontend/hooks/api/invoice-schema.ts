import { z } from "zod";

/**
 * Customer invoicing — the org's own receivables, not platform billing.
 *
 * Money here is `decimal(18,4)` selected raw, so **every amount is a STRING**.
 * `/invoices/stats` is the one exception: its aggregates carry an explicit
 * `::float` cast server-side, so those two totals really are numbers.
 *
 * Three things the hand-written types got wrong, all verified against
 * `invoiceStatusEnum` and the `invoices` table:
 *   · the status enum has EIGHT values. `SENT`, `PARTIALLY_PAID` and `OVERDUE`
 *     were missing from the client union, so three reachable states fell
 *     through every exhaustive branch on status.
 *   · `sentAt` / `paidAt` / `viewedAt` / `createdAt` / `updatedAt` were typed
 *     `Date`. JSON has no Date — a timestamp arrives as an ISO string, and
 *     `someDate.getTime()` on one of these throws.
 *   · `lineItems` was contracted as unreachable because no read route joined
 *     `invoice_items`. The detail route now does, so it is contracted as the
 *     persisted row — string decimals — with a default for the list route.
 *
 * Not `.strict()`: the detail route returns the full `clients` row where the
 * list returns `{ id, name }`, and both must pass one contract.
 */

export const invoiceStatusContract = z.enum([
  "DRAFT",
  "ISSUED",
  "SENT",
  "PARTIALLY_PAID",
  "OVERDUE",
  "PAID",
  "FAILED",
  "VOIDED",
]);

/**
 * The persisted `invoice_items` row as the detail route returns it. Every numeric column is
 * `decimal` in Postgres and arrives as a string, so it is contracted as one — the same treatment
 * `subtotal` and `total` already get on this record. The write shape is different and lives with
 * the create/update input, which sends numbers.
 */
export const invoiceItemContract = z.object({
  id: z.number(),
  description: z.string(),
  hsnSacCode: z.string().nullable(),
  quantity: z.string(),
  rate: z.string(),
  gstRate: z.string(),
  amount: z.string(),
  lineOrder: z.number(),
});

const namedRefContract = z.object({ id: z.number(), name: z.string() });
const creatorRefContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const invoicePaymentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  invoiceId: z.number(),
  amount: z.string(),
  paymentDate: z.string(),
  paymentMethod: z.string(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  creator: creatorRefContract.nullish(),
});

export const invoiceContract = z.object({
  id: z.number(),
  orgId: z.string(),
  invoiceNumber: z.string(),
  clientId: z.number().nullable(),
  projectId: z.number().nullable(),
  createdBy: z.string(),
  /**
   * The invoice's persisted `invoice_items`, in line order. The detail route joins them; the
   * list route does not, so the default keeps the array non-optional for readers rather than
   * letting an undefined stand in for "this route did not ask".
   */
  lineItems: z.array(invoiceItemContract).default([]),
  subtotal: z.string(),
  taxRate: z.string().nullable(),
  taxAmount: z.string().nullable(),
  discount: z.string().nullable(),
  total: z.string(),
  amountPaid: z.string(),
  cgstAmount: z.string().nullish(),
  sgstAmount: z.string().nullish(),
  igstAmount: z.string().nullish(),
  exchangeRate: z.string().nullish(),
  currency: z.string(),
  status: invoiceStatusContract,
  dueDate: z.string().nullable(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  placeOfSupply: z.string().nullish(),
  customerGstin: z.string().nullish(),
  supplierGstin: z.string().nullish(),
  reverseCharge: z.boolean().nullish(),
  taxInclusive: z.boolean().nullish(),
  isRecurring: z.boolean(),
  recurringInterval: z.string().nullable(),
  nextRecurringDate: z.string().nullable(),
  sentAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  viewedAt: z.string().nullable(),
  collectionOwnerId: z.string().nullable(),
  promiseToPayDate: z.string().nullable(),
  client: namedRefContract.nullable(),
  project: namedRefContract.nullable(),
  creator: creatorRefContract.nullable(),
  payments: z.array(invoicePaymentContract).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invoicesPageContract = z.object({
  items: z.array(invoiceContract),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const invoiceStatsContract = z.object({
  draft: z.number(),
  issued: z.number(),
  paid: z.number(),
  failed: z.number(),
  voided: z.number(),
  totalOutstanding: z.number(),
  totalPaid: z.number(),
});

export const invoiceSuccessContract = z.object({ success: z.literal(true) });

export type InvoiceStatus = z.infer<typeof invoiceStatusContract>;
export type InvoiceItem = z.infer<typeof invoiceItemContract>;
export type Payment = z.infer<typeof invoicePaymentContract>;
export type Invoice = z.infer<typeof invoiceContract>;
export type InvoicesResponse = z.infer<typeof invoicesPageContract>;
export type InvoiceStats = z.infer<typeof invoiceStatsContract>;
