import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

function hasLetterOrDigit(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

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
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => isValidPhoneNumber(val), "Please enter a valid phone number"),
  whatsappSameAsPhone: z.boolean(),
  whatsappNumber: z
    .string()
    .refine((val) => !val || isValidPhoneNumber(val), "Please enter a valid WhatsApp number")
    .optional(),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation must be at most 120 characters")
    .refine(hasLetterOrDigit, "Designation must contain a letter or number"),
  departmentId: z.string().min(1, "Department is required"),
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
  attachToExistingMember: z.boolean().optional(),
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
  salaryStructureTemplateId: z.number().int().positive().optional(),
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
      esiIpNumber: z
        .string()
        .trim()
        .max(20)
        .optional()
        .or(z.literal("")),
    })
    .optional(),
});
