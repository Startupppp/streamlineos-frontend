import { z } from "zod";

export const costCenterFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine(
      (v) => /[\p{L}\p{N}]/u.test(v),
      "Name must contain at least one letter or number",
    ),
  description: z.string().trim().max(500).optional(),
});

export type CostCenterFormValues = z.infer<typeof costCenterFormSchema>;
