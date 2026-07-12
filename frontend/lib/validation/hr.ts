import { z } from "zod";

export const onboardEmployeeInputSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .regex(/^[A-Za-z\s'-]+$/, "Only alphabetic characters, spaces, hyphens and apostrophes are allowed")
    .refine((v) => !/\s{2,}/.test(v), "First name cannot have consecutive spaces"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .regex(/^[A-Za-z\s'-]+$/, "Only alphabetic characters, spaces, hyphens and apostrophes are allowed")
    .refine((v) => !/\s{2,}/.test(v), "Last name cannot have consecutive spaces"),
  email: z.string().email("Invalid email address").max(254, "Email must be at most 254 characters"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().min(1, "Phone number is required").refine((val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Please enter a valid phone number (7–15 digits)"),
  whatsappSameAsPhone: z.boolean().default(true),
  whatsappNumber: z.string().refine((val) => {
    if (!val) return true;
    const digits = val.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Please enter a valid WhatsApp number (7–15 digits)").optional(),
  password: z.string().max(128, "Password must be at most 128 characters").refine((val) => !val || val.length >= 8, {
    message: "Password must be at least 8 characters",
  }).optional(),
  designation: z
    .string()
    .trim()
    .min(2, "Designation must be at least 2 characters")
    .max(100, "Designation must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Designation must contain at least one letter")
    .refine((v) => !/\s{2,}/.test(v), "Designation cannot have consecutive spaces"),
  departmentId: z.coerce.number().int().positive({ message: "Department is required" }),
  role: z.string().default("ENGINEERING"),
  employeeId: z
    .string()
    .trim()
    .min(2, "Employee ID must be at least 2 characters")
    .max(20, "Employee ID must be at most 20 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Employee ID can only contain letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  joiningDate: z.coerce.date(),
  dateOfBirth: z.coerce
    .date()
    .refine((d) => d < new Date(), "Date of birth cannot be in the future")
    .refine((d) => {
      const ageMs = Date.now() - d.getTime();
      return ageMs >= 16 * 365.25 * 24 * 3600 * 1000;
    }, "Employee must be at least 16 years old"),
  taxId: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)").optional().or(z.literal("")),
  monthlySalary: z.coerce.number().min(0, "Salary cannot be negative").max(9_999_999, "Salary exceeds maximum allowed value").optional(),
  bankDetails: z.object({
    accountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be 9–18 digits").optional().or(z.literal("")),
    bankName: z.string().regex(/^[A-Za-z\s]+$/, "Bank name must contain only letters").optional().or(z.literal("")),
    branch: z.string().regex(/^[A-Za-z\s]+$/, "Branch name must contain only letters").optional().or(z.literal("")),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g. SBIN0001234)").optional().or(z.literal("")),
    accountHolder: z.string().trim().min(2, "Account holder name must be at least 2 characters").refine((v) => /[A-Za-z]/.test(v), "Account holder name must contain letters and match the bank account name.").refine((v) => /^[A-Za-z\s'.,-]+$/.test(v), "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods").optional().or(z.literal("")),
    pfUanNumber: z.string().regex(/^\d{12}$/, "UAN must be exactly 12 digits").optional().or(z.literal("")),
  }).optional(),
}).superRefine((data, ctx) => {
  const fn = data.firstName.trim().toLowerCase();
  const ln = data.lastName.trim().toLowerCase();
  if (fn && ln && fn === ln) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "First name and last name cannot be identical", path: ["lastName"] });
  }
});
