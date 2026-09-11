import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const taxCodeContract = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  rate: z.string(),
  taxType: z.string(),
  isReverseCharge: z.boolean(),
  collectedAccountId: z.number().nullable(),
  paidAccountId: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const taxCodeListContract = cursorPageContract(taxCodeContract);

export const taxCodeCreatedContract = taxCodeContract;

export const taxCodeUpdatedContract = taxCodeContract;

export const taxCodeSeedContract = z.object({
  seeded: z.number(),
  skipped: z.number(),
});

const taxRateGroupContract = z.object({
  rate: z.string(),
  taxableValue: z.string(),
  cgst: z.string(),
  sgst: z.string(),
  igst: z.string(),
  total: z.string(),
  docCount: z.number(),
});

const recentTaxPaymentContract = z.object({
  id: z.number(),
  taxType: z.string(),
  amount: z.string(),
  paidDate: z.string(),
  reference: z.string().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export const taxDashboardContract = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  outputTaxByRate: z.array(taxRateGroupContract),
  inputTaxByRate: z.array(taxRateGroupContract),
  summary: z.object({
    totalOutputTax: z.string(),
    totalInputTax: z.string(),
    netLiability: z.string(),
    unpaidLiability: z.string(),
    taxPayableBalance: z.string(),
    taxReceivableBalance: z.string(),
  }),
  recentPayments: z.array(recentTaxPaymentContract),
  nextDue: z.object({ gstr1: z.string(), gstr3b: z.string() }),
});

const taxLineContract = z.object({
  sourceType: z.string(),
  sourceId: z.number(),
  docNumber: z.string(),
  date: z.string(),
  partyName: z.string(),
  taxableValue: z.string(),
  gstRate: z.string(),
  cgst: z.string(),
  sgst: z.string(),
  igst: z.string(),
  total: z.string(),
});

export const taxOutputReportContract = cursorPageContract(taxLineContract);
export const taxInputReportContract = cursorPageContract(taxLineContract);

export const taxLiabilitySummaryContract = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  months: z.array(
    z.object({
      month: z.string(),
      outputTax: z.string(),
      inputTax: z.string(),
      netLiability: z.string(),
      cumulativeUnpaid: z.string(),
    }),
  ),
  totalOutputTax: z.string(),
  totalInputTax: z.string(),
  totalNetLiability: z.string(),
  taxPayableBalance: z.string(),
});

const taxPaymentContract = z.object({
  id: z.number(),
  taxType: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  amount: z.string(),
  paidDate: z.string(),
  reference: z.string().nullable(),
  journalEntryId: z.number().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string().nullable(),
});

export const taxPaymentListContract = z.object({
  items: z.array(taxPaymentContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.number().nullable(),
  }),
});

export const taxPaymentCreatedContract = taxPaymentContract.extend({
  orgId: z.string(),
  archivedAt: z.string().nullable(),
  archivedBy: z.string().nullable(),
  archivedReason: z.string().nullable(),
});

export const taxPaymentDeleteContract = z.object({ archived: z.boolean() });

export const taxAdjustmentCreatedContract = z.object({
  entryId: z.number(),
  entryNumber: z.string(),
});

export type TaxCodeList = z.infer<typeof taxCodeListContract>;
export type TaxDashboard = z.infer<typeof taxDashboardContract>;
export type TaxPaymentList = z.infer<typeof taxPaymentListContract>;
