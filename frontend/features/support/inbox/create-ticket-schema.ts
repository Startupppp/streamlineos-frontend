import { z } from "zod";

export const TICKET_CATEGORIES = [
  "Technical Issue",
  "Billing",
  "Feature Request",
  "Account",
  "Performance",
  "Integration",
  "Other",
] as const;

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters")
    .refine((v) => !/\s{2,}/.test(v.trim()), "Title cannot have multiple consecutive spaces")
    .refine((v) => !/^[\W\s]+$/.test(v.trim()), "Title cannot consist of only special characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), "Title must contain at least one letter or number")
    .refine((v) => !/[<>{}|\\^`]/.test(v.trim()), "Title contains invalid characters (<>{}|\\^`)"),
  category: z.enum(TICKET_CATEGORIES, { error: "Please select a category" }),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"] as const),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;
