import { z } from "zod";

export const departmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine(
      (departmentName) => departmentName.length === 0 || /[\p{L}\p{N}]/u.test(departmentName),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  branchId: z.string().optional(),
  headUserId: z.string().optional(),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export const EMPTY_DEPARTMENT_FORM_VALUES: DepartmentFormValues = {
  name: "",
  code: "",
  branchId: "",
  headUserId: "",
  description: "",
};
