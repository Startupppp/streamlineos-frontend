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
 *   · `lineItems` is a WRITE-ONLY input used to derive the subtotal. It is not
 *     a column and no read route has ever returned it, so it is contracted with
 *     a default rather than as data — see the note on the field.
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

export const invoiceItemContract = z.object({
  description: z.string(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
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
   * Never sent. `lineItems` is an input on POST/PATCH that the backend folds
   * into `subtotal`; the persisted rows live in `invoice_items` and no read
   * route joins them. The default keeps the array non-optional for readers
   * while making the emptiness explicit instead of an undefined in disguise.
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

export type InvoiceStatus = z.infer<typeof invoiceStatusContract>;
export type InvoiceItem = z.infer<typeof invoiceItemContract>;
export type Payment = z.infer<typeof invoicePaymentContract>;
export type Invoice = z.infer<typeof invoiceContract>;
export type InvoicesResponse = z.infer<typeof invoicesPageContract>;
export type InvoiceStats = z.infer<typeof invoiceStatsContract>;
