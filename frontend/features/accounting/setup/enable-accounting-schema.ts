import { z } from "zod";

export const enableAccountingSchema = z.object({
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code, such as IN")
    .transform((value) => value.toUpperCase()),
  packCode: z.string().min(1, "Choose a country pack"),
  baseCurrency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code, such as INR")
    .transform((value) => value.toUpperCase()),
  name: z.string().min(1, "Give the book a name").max(120),
  openFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type EnableAccountingFormValues = z.input<typeof enableAccountingSchema>;
export type EnableAccountingPayload = z.output<typeof enableAccountingSchema>;

export const taxRegistrationSchema = z.object({
  regime: z.enum([
    "GST_IN",
    "VAT_EU",
    "VAT_GB",
    "VAT_GCC",
    "GST_SG",
    "GST_AU",
    "GST_HST_CA",
    "SALES_TAX_US",
    "PAN_IN",
    "TAN_IN",
    "EIN_US",
    "GENERIC",
  ]),
  number: z.string().min(2, "Enter the registration number").max(64),
  region: z.string().max(16).optional().or(z.literal("").transform(() => undefined)),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code")
    .transform((value) => value.toUpperCase()),
});

export type TaxRegistrationFormValues = z.input<typeof taxRegistrationSchema>;
