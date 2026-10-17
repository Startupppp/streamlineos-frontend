import { z } from "zod";

export const costCenterFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine(
      (v) => v.length === 0 || /[\p{L}\p{N}]/u.test(v),
      "Name must contain at least one letter or number",
    ),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export type CostCenterFormValues = z.infer<typeof costCenterFormSchema>;

export const EMPTY_COST_CENTER_FORM_VALUES: CostCenterFormValues = {
  code: "",
  name: "",
  description: "",
};
