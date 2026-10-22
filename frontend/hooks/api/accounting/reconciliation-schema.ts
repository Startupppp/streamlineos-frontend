import { z } from "zod";


const unpostedReasonContract = z.enum(["no_posting_path", "post_missing", "not_applicable"]);

const reasonTotalsContract = z.object({
  transactionType: z.string(),
  reason: unpostedReasonContract,
  movements: z.number().int(),
  valueMinor: z.number().int(),
});

export const unpostedMovementsContract = z.object({
  enabled: z.boolean(),
  from: z.string(),
  to: z.string(),
  movements: z.number().int(),
  valueMinor: z.number().int(),
  byReason: z.array(
    z.object({
      reason: unpostedReasonContract,
      movements: z.number().int(),
      valueMinor: z.number().int(),
    }),
  ),
  byTransactionType: z.array(reasonTotalsContract),
  sample: z.array(
    z.object({
      transactionId: z.number().int(),
      postingDate: z.string().nullable(),
      transactionType: z.string(),
      referenceType: z.string().nullable(),
      referenceId: z.string().nullable(),
      valueMinor: z.number().int(),
      reason: unpostedReasonContract,
    }),
  ),
  notes: z.array(z.string()),
});

export const stockGlReconciliationContract = z.object({
  enabled: z.boolean(),
  from: z.string(),
  to: z.string(),
  glMovementMinor: z.number().int(),
  postedMovementValueMinor: z.number().int(),
  unpostedValueMinor: z.number().int(),
  bridgeDifferenceMinor: z.number().int(),
  verdict: z.enum(["balanced", "explained_by_unposted", "unexplained"]),
  exceptions: z.array(reasonTotalsContract),
  notes: z.array(z.string()),
});

export type UnpostedReason = z.infer<typeof unpostedReasonContract>;
export type UnpostedMovementsReport = z.infer<typeof unpostedMovementsContract>;
export type StockGlReconciliation = z.infer<typeof stockGlReconciliationContract>;
