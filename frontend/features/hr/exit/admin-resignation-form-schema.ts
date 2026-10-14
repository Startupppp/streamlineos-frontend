import { z } from "zod";
import { RESIGNATION_REASONS } from "@/lib/constants/hr-separation";

export const adminResignationFormSchema = z.object({
  targetUserId: z.string().min(1, "Employee is required"),
  reasonCategory: z.enum(RESIGNATION_REASONS),
  reason: z.string().min(50, "Detailed reason must be at least 50 characters").max(2000),
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  willingForExitInterview: z.boolean().default(false),
  companyFeedback: z.string().max(2000).optional(),
});

export type AdminResignationFormValues = z.infer<typeof adminResignationFormSchema>;
