import { z } from "zod";

export const referSchema = z.object({
  firstName: z.string().min(1, "First name required").trim(),
  lastName: z.string().min(1, "Last name required").trim(),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  jobPostingId: z.string().optional(),
  relationship: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type ReferFormValues = z.infer<typeof referSchema>;
