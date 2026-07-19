import { z } from "zod";

export const createAdjustmentSchema = z.object({
  userId: z.string().min(1, "Required"),
  adjustmentType: z.enum(["arrears", "recovery", "correction"] as const),
  section: z.enum([
    "employee_master",
    "compensation",
    "attendance",
    "leave",
    "overtime",
    "reimbursement",
    "deduction",
    "lifecycle",
  ] as const),
  amountCents: z.string().optional(),
  days: z.string().optional(),
  reason: z.string().min(1, "Required").max(1000),
});

export type CreateAdjustmentFormValues = z.infer<typeof createAdjustmentSchema>;
