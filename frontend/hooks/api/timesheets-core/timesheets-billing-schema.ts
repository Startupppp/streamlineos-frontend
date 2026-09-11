import { z } from "zod";

const convertedTotalsContract = z
  .object({
    baseCurrency: z.string(),
    convertedTotal: z.number(),
    conversions: z.array(
      z.object({
        currency: z.string(),
        amount: z.number(),
        rate: z.number(),
        rateDate: z.string().nullable(),
        converted: z.number(),
      }),
    ),
    missingRates: z.array(z.string()),
  })
  .nullable();

export const billingUninvoicedResponseContract = z.object({
  groups: z.array(
    z.object({
      projectId: z.number(),
      projectName: z.string(),
      totalHours: z.number(),
      billableAmount: z.number(),
      currency: z.string(),
      entryCount: z.number(),
      missingRate: z.boolean(),
    }),
  ),
  totals: z.object({
    hours: z.number(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
    mixed: z.boolean(),
    byCurrency: z.array(z.object({ currency: z.string(), amount: z.number(), hours: z.number() })),
    converted: convertedTotalsContract,
  }),
});

export const billingExportResponseContract = z.object({
  exportId: z.number(),
  entryCount: z.number(),
  totalHours: z.number(),
  totalAmount: z.number(),
  duplicate: z.boolean().optional(),
});

export const billingInvoiceDraftResponseContract = z.object({
  exportId: z.number(),
  entryCount: z.number(),
  amount: z.number(),
});

export const billingRatePreviewResponseContract = z.object({
  billRate: z.number().nullable(),
  costRate: z.number().nullable(),
  currency: z.string(),
  source: z.enum(["RATE_CARD", "PROJECT_MEMBER"]).nullable(),
});
