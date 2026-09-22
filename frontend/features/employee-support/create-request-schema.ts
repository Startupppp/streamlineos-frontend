import { z } from "zod";
import { HELPDESK_CATEGORIES } from "@/lib/employee-support";

export const createRequestSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150, "Title must be at most 150 characters"),
  category: z.enum(HELPDESK_CATEGORIES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  description: z.union([z.literal(""), z.string().trim().min(10, "Description must be at least 10 characters").max(2000)]),
  isConfidential: z.boolean(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
