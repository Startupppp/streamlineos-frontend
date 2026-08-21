import * as z from "zod";

const hasLetterOrDigit = (value: string) => /[\p{L}\p{N}]/u.test(value);

export const employeeFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters")
    .refine(hasLetterOrDigit, "First name must contain a letter or number"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters")
    .refine(hasLetterOrDigit, "Last name must contain a letter or number"),
  role: z.string(),
  designation: z
    .string()
    .trim()
    .max(120, "Designation must be at most 120 characters")
    .refine(
      (value) => value === "" || hasLetterOrDigit(value),
      "Designation must contain a letter or number",
    )
    .optional()
    .or(z.literal("")),
  departmentId: z.string().optional(),
  phone: z
    .string()
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Phone number must be 7-15 digits")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  joiningDate: z.date().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
