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
