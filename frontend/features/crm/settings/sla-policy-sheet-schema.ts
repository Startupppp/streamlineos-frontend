import { z } from "zod";

export const slaPolicySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0,
      "Must be a positive whole number",
    ),
  resolutionHours: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0,
      "Must be a positive whole number",
    ),
  businessHours: z.boolean(),
});

export type SlaPolicyFormValues = z.infer<typeof slaPolicySchema>;
