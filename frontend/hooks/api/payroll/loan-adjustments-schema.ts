import { z } from "zod";

export const loanAdjustmentResponseContract = z.object({ ok: z.boolean() });

export type LoanAdjustmentResponse = z.infer<typeof loanAdjustmentResponseContract>;
