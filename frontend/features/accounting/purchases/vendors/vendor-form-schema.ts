import { z } from "zod";

export const vendorFormSchema = z.object({
  displayName: z.string().trim().min(1, "Give the vendor a name").max(255),
  legalName: z.string().max(255).optional(),
  email: z
    .string()
    .max(255)
    .optional()
    .refine(
      (value) => !value || value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      "Enter a valid email",
    ),
  phone: z.string().max(64).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code, such as IN"),
  defaultCurrency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code, such as INR"),
  billingCity: z.string().max(120).optional(),
  billingRegion: z.string().max(64).optional(),
  defaultExpenseAccountId: z.string().max(64).optional(),
  paymentTermsDays: z.string().regex(/^\d{1,4}$/, "Enter a whole number of days"),
  withholdingCode: z.string().max(32).optional(),
  role: z.enum(["vendor", "both"]),
  notes: z.string().max(4000).optional(),
  isActive: z.boolean(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
