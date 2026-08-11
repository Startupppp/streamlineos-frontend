import { z } from "zod";

export const activityFormSchema = z.object({
  activityType: z.string().min(1, "Activity type is required"),
  subject: z.string(),
  duration: z
    .string()
    .refine((v) => v === "" || /^\d+$/.test(v), { message: "Must be a whole number" }),
  outcome: z.string(),
  activityNotes: z.string(),
  location: z.string(),
});

export type ActivityFormInternalValues = z.infer<typeof activityFormSchema>;
