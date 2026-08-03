import { z } from "zod";

export const requisitionSchema = z.object({
  title: z.string().min(2, "Title is required"),
  department: z.string().optional(),
  location: z.string().optional(),
  headcount: z.number().int().min(1, "At least 1"),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  justification: z.string().optional(),
  targetDate: z.string().optional(),
});

export type RequisitionFormValues = z.infer<typeof requisitionSchema>;
