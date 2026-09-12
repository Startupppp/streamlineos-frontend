import { z } from "zod";
import type { ComboboxOption } from "@/components/ui/combobox";

export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SG: "SGD",
  AU: "AUD",
};

export const COUNTRIES: ComboboxOption[] = [
  { value: "IN", label: "India" }, { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" }, { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" }, { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" }, { value: "DE", label: "Germany" },
  { value: "FR", label: "France" }, { value: "NL", label: "Netherlands" },
  { value: "MY", label: "Malaysia" }, { value: "PH", label: "Philippines" },
  { value: "NZ", label: "New Zealand" }, { value: "ZA", label: "South Africa" },
  { value: "NG", label: "Nigeria" }, { value: "KE", label: "Kenya" },
  { value: "BD", label: "Bangladesh" }, { value: "PK", label: "Pakistan" },
  { value: "LK", label: "Sri Lanka" }, { value: "NP", label: "Nepal" },
];

export const PAY_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  return { value: String(day), label: `${day}${suffix}` };
});

export const stepProfileSchema = z.object({
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  legalEntityName: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]),
  payDay: z.string().min(1, "Pay day is required"),
  startMonth: z.string().min(1, "Start month is required"),
  employeeCount: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v))),
    { message: "Must be a positive whole number" },
  ),
});

export type ProfileForm = z.infer<typeof stepProfileSchema>;
