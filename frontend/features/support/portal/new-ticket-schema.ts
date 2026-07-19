import { z } from "zod";

export const newTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters"),
  category: z.enum(["general", "billing", "bug_report", "feature_request", "onboarding", "internal_it"]),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description must be at most 5000 characters"),
});

export type NewTicketFormValues = z.infer<typeof newTicketSchema>;
