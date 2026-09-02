import { z } from "zod";

/**
 * Accounting statement reports. Every amount is a server-side `.toFixed(2)`
 * string, never a number — the aggregate is a `decimal` the driver hands back
 * as a string and the service formats rather than parses.
 *
 * `netPayable` can be negative, so it is not a non-negative decimal.
 */

export const expenseByCategoryRowContract = z.object({
  categoryId: z.number().nullable(),
  categoryName: z.string(),
  totalAmount: z.string(),
  count: z.number(),
});

export const expenseByCategoryContract = z.array(expenseByCategoryRowContract);

export const taxSummaryRowContract = z.object({
  month: z.string(),
  outputCgst: z.string(),
  outputSgst: z.string(),
  outputIgst: z.string(),
  inputCgst: z.string(),
  inputSgst: z.string(),
  inputIgst: z.string(),
  netPayable: z.string(),
});

export const taxSummaryContract = z.array(taxSummaryRowContract);

export type ExpenseByCategoryRow = z.infer<typeof expenseByCategoryRowContract>;
export type TaxSummaryRow = z.infer<typeof taxSummaryRowContract>;
