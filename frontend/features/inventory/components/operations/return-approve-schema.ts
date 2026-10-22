import { z } from "zod";

export const approveReturnSchema = z.object({
  creditReference: z.string().trim().max(200).optional(),
});

export type ApproveReturnFormValues = z.infer<typeof approveReturnSchema>;
