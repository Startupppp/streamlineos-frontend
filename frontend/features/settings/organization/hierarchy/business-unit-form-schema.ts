import { z } from "zod";

export const businessUnitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine(
      (businessUnitName) => /[\p{L}\p{N}]/u.test(businessUnitName),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2, "Code must be 2â€“20 characters")
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  description: z.string().trim().max(500).optional(),
});

export type BusinessUnitFormValues = z.infer<typeof businessUnitFormSchema>;

export const EMPTY_BUSINESS_UNIT_FORM_VALUES: BusinessUnitFormValues = {
  name: "",
  code: "",
  description: "",
};
