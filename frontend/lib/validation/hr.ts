import { z } from "zod";

/** Collapse internal whitespace; trim ends. Prefer for submit-time cleanup. */
export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hasLetterOrDigit(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

/**
 * Employee onboard form schema — intentionally permissive on special characters
 * and whitespace so real-world names/titles don't fail validation.
 * We only require non-empty meaningful text and light format checks for PAN/IFSC/etc.
 */
export const onboardEmployeeInputSchema = z.object({
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
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(254, "Email must be at most 254 characters"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().min(1, "Phone number is required").refine((val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Please enter a valid phone number (7–15 digits)"),
  whatsappSameAsPhone: z.boolean(),
  whatsappNumber: z
    .string()
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Please enter a valid WhatsApp number (7–15 digits)")
    .optional(),
  password: z
    .string()
    .max(128, "Password must be at most 128 characters")
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters",
    })
    .optional(),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation must be at most 120 characters")
    .refine(hasLetterOrDigit, "Designation must contain a letter or number"),
  departmentId: z.number().int().positive({ message: "Department is required" }),
  role: z.string().min(1),
  employeeId: z
    .string()
    .trim()
    .max(40, "Employee ID must be at most 40 characters")
    .refine(
      (v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9._/\- ]*$/.test(v),
      "Employee ID can use letters, numbers, spaces, dots, underscores, hyphens, and slashes",
    )
    .optional()
    .or(z.literal("")),
  joiningDate: z.date(),
  dateOfBirth: z
    .date()
    .refine((d) => d < new Date(), "Date of birth cannot be in the future")
    .refine((d) => {
      const ageMs = Date.now() - d.getTime();
      return ageMs >= 16 * 365.25 * 24 * 3600 * 1000;
    }, "Employee must be at least 16 years old"),
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
  bankDetails: z
    .object({
      accountNumber: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{6,20}$/.test(v), "Account number must be 6–20 digits")
        .optional()
        .or(z.literal("")),
      bankName: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("")),
      branch: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("")),
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
        .refine(
          (v) => v === "" || hasLetterOrDigit(v),
          "Account holder name looks invalid",
        )
        .optional()
        .or(z.literal("")),
      pfUanNumber: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{12}$/.test(v), "UAN must be exactly 12 digits")
        .optional()
        .or(z.literal("")),
    })
    .optional(),
});

export type OnboardEmployeeFormValues = z.infer<typeof onboardEmployeeInputSchema>;
