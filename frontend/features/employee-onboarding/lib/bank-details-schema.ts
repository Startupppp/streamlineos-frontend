import { z } from "zod";

const BANK_NAME_REGEX = /^[A-Za-z][A-Za-z0-9.,'&()\-\s]*$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const SSN_REGEX = /^\d{3}-?\d{2}-?\d{4}$/;

export const bankDetailsSchema = z.object({
  accountHolder: z
    .string()
    .trim()
    .min(2, "Account holder name must be at least 2 characters")
    .refine(
      (v) => /[A-Za-z]/.test(v),
      "Account holder name must contain letters and match the bank account name.",
    )
    .refine(
      (v) => /^[A-Za-z\s'.,-]+$/.test(v),
      "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods",
    ),
  bankName: z
    .string()
    .min(2, "Bank Name is required")
    .max(100, "Bank Name must be at most 100 characters")
    .regex(
      BANK_NAME_REGEX,
      "Bank Name can only contain letters, numbers, spaces, and basic punctuation",
    ),
  accountNumber: z
    .string()
    .min(8, "Account Number must be at least 8 digits")
    .max(18, "Account Number must be at most 18 digits")
    .regex(/^\d+$/, "Account Number must contain only digits"),
  ifsc: z
    .string()
    .min(11, "IFSC Code must be 11 characters")
    .max(11, "IFSC Code must be 11 characters")
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      "Enter a valid IFSC Code (e.g. HDFC0001234)",
    ),
  taxId: z
    .string()
    .optional()
    .refine(
      (val) => !val || PAN_REGEX.test(val.toUpperCase()) || SSN_REGEX.test(val),
      "Enter a valid PAN (ABCDE1234F) or SSN (123-45-6789)",
    ),
});

export type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;
