import { z } from "zod";


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
