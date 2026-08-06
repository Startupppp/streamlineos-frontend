import * as z from "zod";

const hasLetterOrDigit = (v: string) => /[\p{L}\p{N}]/u.test(v);

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
    .refine((v) => v === "" || hasLetterOrDigit(v), "Designation must contain a letter or number")
    .optional()
    .or(z.literal("")),
  departmentId: z.string().optional(),
  phone: z
    .string()
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Phone number must be 7–15 digits")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  joiningDate: z.date().optional(),
  taxId: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/i.test(v),
      "Invalid PAN format (e.g. ABCDE1234F)",
    )
    .optional()
    .or(z.literal("")),
  monthlySalary: z
    .number()
    .min(0, "Salary cannot be negative")
    .max(9_999_999, "Salary exceeds maximum allowed value")
    .optional(),
  bankAccount: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{6,20}$/.test(v), "Account number must be 6–20 digits")
    .optional()
    .or(z.literal("")),
  bankName: z.string().trim().max(100).optional().or(z.literal("")),
  branch: z.string().trim().max(100).optional().or(z.literal("")),
  ifsc: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/i.test(v),
      "Invalid IFSC code format (e.g. SBIN0001234)",
    )
    .optional()
    .or(z.literal("")),
  accountHolder: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || hasLetterOrDigit(v), "Account holder name looks invalid")
    .optional()
    .or(z.literal("")),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
