import { z } from "zod";

export const anomalyFindingContract = z.object({
  id: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  kind: z.enum([
    "EXPENSE_SPIKE",
    "DUPLICATE_BILL_SUSPECT",
    "UNUSUAL_JOURNAL",
    "ROUND_AMOUNT_PATTERN",
    "AR_CONCENTRATION",
    "CASH_DIP_PROJECTED",
  ]),
  title: z.string(),
  detail: z.string(),
  drill: z.object({
    type: z.string(),
    params: z.record(z.string(), z.union([z.string(), z.number()])),
  }),
});

export const anomaliesContract = z.array(anomalyFindingContract);

export const digestContract = z.object({
  headline: z.string(),
  positives: z.array(z.string()),
  watchouts: z.array(z.string()),
});

export const categorizeSuggestContract = z.object({
  categoryId: z.number().nullable(),
  categoryName: z.string().nullable(),
  confidence: z.number(),
  basis: z.enum(["none", "history"]),
});

export type AnomalyFinding = z.infer<typeof anomalyFindingContract>;
export type Digest = z.infer<typeof digestContract>;
export type CategorizeSuggest = z.infer<typeof categorizeSuggestContract>;
