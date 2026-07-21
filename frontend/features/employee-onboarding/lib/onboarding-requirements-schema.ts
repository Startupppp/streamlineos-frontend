import { z } from "zod";
import { getAllCountries } from "countries-and-timezones";

const bankFieldSchema = z.object({
  key: z.enum([
    "accountHolder",
    "bankName",
    "accountNumber",
    "routingCode",
    "iban",
    "swift",
  ]),
  label: z.string(),
  placeholder: z.string(),
  required: z.boolean(),
  uppercase: z.boolean().optional(),
  help: z.string().optional(),
});

const statutoryFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  placeholder: z.string(),
  required: z.boolean(),
  uppercase: z.boolean().optional(),
  help: z.string().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
});

export const onboardingRequirementsSchema = z.object({
  countryCode: z.string(),
  bankScheme: z.string(),
  bankFields: z.array(bankFieldSchema),
  statutoryFields: z.array(statutoryFieldSchema),
});

export type OnboardingRequirements = z.infer<
  typeof onboardingRequirementsSchema
>;

const NAME_TO_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const country of Object.values(getAllCountries())) {
    map[country.name.toLowerCase()] = country.id;
  }
  return map;
})();

export function countryNameToCode(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "IN";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return NAME_TO_CODE[trimmed.toLowerCase()] ?? "IN";
}
