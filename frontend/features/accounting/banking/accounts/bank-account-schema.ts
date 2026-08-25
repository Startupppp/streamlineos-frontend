import { z } from "zod";

export const bankAccountFormSchema = z.object({
  accountId: z.string().min(1, "Choose the cash account this bank account belongs to"),
  displayName: z.string().trim().min(1, "Give the account a name you will recognise").max(160),
  bankName: z.string().max(160).optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code"),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/, "Use a two-letter country code"),
  identifierScheme: z.enum([
    "IFSC_ACCOUNT",
    "IBAN",
    "ROUTING_ACCOUNT",
    "SORT_ACCOUNT",
    "BSB_ACCOUNT",
    "UPI",
    "OTHER",
  ]),
  identifierValue: z.string().max(64).optional(),
  branchIdentifier: z.string().max(64).optional(),
  csvMappingPreset: z.string().max(64).optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;
