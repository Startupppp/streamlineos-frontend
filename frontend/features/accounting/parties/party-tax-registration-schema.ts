import { z } from "zod";
import type { TaxRegime } from "@/types/accounting/accounting-kernel-ext";
import type { CreatePartyTaxRegistrationInput } from "@/types/accounting/accounting-ar";

export const TAX_REGIME_OPTIONS: ReadonlyArray<{
  value: TaxRegime;
  label: string;
}> = [
  { value: "GST_IN", label: "India GST (GSTIN)" },
  { value: "VAT_EU", label: "EU VAT" },
  { value: "VAT_GB", label: "UK VAT" },
  { value: "VAT_GCC", label: "GCC VAT" },
  { value: "GST_SG", label: "Singapore GST" },
  { value: "GST_AU", label: "Australia GST" },
  { value: "GST_HST_CA", label: "Canada GST/HST" },
  { value: "SALES_TAX_US", label: "US sales tax" },
  { value: "PAN_IN", label: "India PAN" },
  { value: "TAN_IN", label: "India TAN" },
  { value: "EIN_US", label: "US EIN" },
  { value: "GENERIC", label: "Other" },
];

export const partyTaxRegistrationSchema = z.object({
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
  number: z.string().trim().min(1, "Enter the registration number").max(64),
  region: z.string().trim().max(16),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Two-letter country code, such as IN"),
  isPrimary: z.boolean(),
});

export type PartyTaxRegistrationValues = z.infer<
  typeof partyTaxRegistrationSchema
>;

export function toTaxRegistrationInput(
  values: PartyTaxRegistrationValues,
): CreatePartyTaxRegistrationInput {
  return {
    regime: values.regime,
    number: values.number.toUpperCase(),
    region: values.region.length > 0 ? values.region : null,
    countryCode: values.countryCode.toUpperCase(),
    isPrimary: values.isPrimary,
  };
}
