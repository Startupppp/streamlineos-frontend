import { z } from "zod";

export const transitionFormSchema = z.object({
  fromStatusId: z.string(),
  toStatusId: z.string().min(1, "Required"),
  name: z.string(),
  requiresApproval: z.boolean(),
  requiredFields: z.string(),
  allowedRoles: z.string(),
});

export type TransitionFormValues = z.infer<typeof transitionFormSchema>;
