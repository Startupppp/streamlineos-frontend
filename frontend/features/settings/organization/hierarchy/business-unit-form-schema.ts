import { z } from "zod";

export const businessUnitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine(
      (businessUnitName) => businessUnitName.length === 0 || /[\p{L}\p{N}]/u.test(businessUnitName),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2, "Code must be 2—20 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export type BusinessUnitFormValues = z.infer<typeof businessUnitFormSchema>;

export const EMPTY_BUSINESS_UNIT_FORM_VALUES: BusinessUnitFormValues = {
  name: "",
  code: "",
  description: "",
};
