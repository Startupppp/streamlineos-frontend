import { z } from "zod";

const paymentTermContract = z.object({
  key: z.string(),
  label: z.string(),
  days: z.number(),
  isDefault: z.boolean().optional(),
});

export const accountingSettingsContract = z.object({
  id: z.number(),
  orgId: z.string(),
  baseCurrency: z.string(),
  fiscalYearStartMonth: z.number(),
  accountingBasis: z.string(),
  taxRegistration: z.unknown().nullable(),
  coaTemplate: z.string().nullable(),
  setupCompletedAt: z.string().nullable(),
  retainedEarningsAccountId: z.number().nullable(),
  paymentTerms: z.array(paymentTermContract),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sequenceContract = z.object({
  id: z.number().nullable(),
  orgId: z.string(),
  entityType: z.string(),
  prefix: z.string(),
  padding: z.number(),
  nextNumber: z.number(),
  createdAt: z.string().nullable(),
});

export const sequenceListContract = z.object({ items: z.array(sequenceContract) });

const systemAccountRowContract = z.object({
  purpose: z.string(),
  mapped: z.boolean(),
  accountId: z.number().nullable(),
  accountCode: z.string().nullable(),
  accountName: z.string().nullable(),
  accountType: z.string().nullable(),
  suggestedAccountId: z.number().nullable(),
  suggestedAccountCode: z.string().nullable(),
  suggestedAccountName: z.string().nullable(),
});

export const systemAccountListContract = z.array(systemAccountRowContract);

export const upsertSystemAccountContract = z.object({
  purpose: z.string(),
  accountId: z.number(),
});

export const updatePaymentTermsContract = z.object({
  id: z.number(),
  orgId: z.string(),
  baseCurrency: z.string(),
  fiscalYearStartMonth: z.number(),
  accountingBasis: z.string(),
  taxRegistration: z.unknown().nullable(),
  coaTemplate: z.string().nullable(),
  setupCompletedAt: z.string().nullable(),
  retainedEarningsAccountId: z.number().nullable(),
  paymentTerms: z.array(paymentTermContract),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountingSettings = z.infer<typeof accountingSettingsContract>;
export type SequenceList = z.infer<typeof sequenceListContract>;
export type SystemAccountList = z.infer<typeof systemAccountListContract>;
