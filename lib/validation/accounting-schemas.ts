import { z } from "zod";
import { paginationSchema, dateRangeSchema, searchSchema } from "./common-schemas";

export const accountTypeSchema = z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);

export const listAccountsQuerySchema = paginationSchema
  .merge(searchSchema)
  .extend({ type: accountTypeSchema.optional(), activeOnly: z.coerce.boolean().optional() });

export const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  accountType: accountTypeSchema,
  parentAccountId: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const listJournalQuerySchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({ sourceType: z.string().max(40).optional() });

export const trialBalanceQuerySchema = z.object({
  asOf: z.string().date(),
});

export const profitLossQuerySchema = dateRangeSchema;

export const listCustomerLedgerQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const listCustomersOutstandingQuerySchema = paginationSchema
  .merge(searchSchema)
  .extend({ onlyOutstanding: z.coerce.boolean().optional() });

export const gstr1QuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const balanceSheetQuerySchema = z.object({
  asOf: z.string().date(),
});

export const agedReceivablesQuerySchema = z.object({
  asOf: z.string().date().optional(),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.string().date(),
  description: z.string().min(1).max(500),
  status: z.enum(["DRAFT", "POSTED"]).default("DRAFT"),
  lines: z
    .array(
      z.object({
        accountCode: z.string().min(1).max(20),
        debit: z.number().nonnegative(),
        credit: z.number().nonnegative(),
        description: z.string().max(500).optional(),
      }),
    )
    .min(2),
});

export const postJournalEntrySchema = z.object({});

export const purchaseBillStatusSchema = z.enum(["DRAFT", "POSTED", "PARTIALLY_PAID", "PAID", "CANCELLED"]);

export const listPurchaseBillsQuerySchema = paginationSchema
  .merge(searchSchema)
  .extend({
    status: purchaseBillStatusSchema.optional(),
    vendorId: z.coerce.number().int().positive().optional(),
  });

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createPurchaseBillSchema = z.object({
  vendorId: z.number().int().positive(),
  vendorBillNumber: z.string().max(60).optional(),
  billDate: z.string().date(),
  dueDate: z.string().date().optional(),
  status: z.enum(["DRAFT", "POSTED"]).default("DRAFT"),
  placeOfSupply: z.string().regex(/^\d{2}$/).optional(),
  vendorGstin: z.string().regex(gstinRegex).optional().or(z.literal("")),
  supplierGstin: z.string().regex(gstinRegex).optional().or(z.literal("")),
  reverseCharge: z.boolean().default(false),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
  expenseAccountCode: z.string().min(1).max(20).default("5990"),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(255),
        hsnSacCode: z.string().max(20).optional(),
        quantity: z.number().positive(),
        rate: z.number().nonnegative(),
        gstRate: z
          .number()
          .refine((v) => [0, 5, 12, 18, 28].includes(v), { message: "gstRate must be 0/5/12/18/28" }),
      }),
    )
    .min(1),
});

export const updatePurchaseBillStatusSchema = z.object({
  status: z.enum(["POSTED", "CANCELLED"]),
});
