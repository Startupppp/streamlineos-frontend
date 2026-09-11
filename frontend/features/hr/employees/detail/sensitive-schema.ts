import { z } from "zod";
import type { HrSensitiveData } from "@/types/hr/core";

/**
 * The sensitive-employee form contract: the Zod schema the form validates
 * against, and the two mappings between it and `HrSensitiveData`.
 *
 * Kept out of `sensitive-tab.tsx` because the mapping is where a money bug would
 * live — salary is stored in integer cents and edited as a decimal string — and
 * because §6 puts a feature's schema in its own `*-schema.ts` rather than inline
 * in the component that renders it.
 */

const emptyOrValid = (schema: z.ZodString) =>
  schema.or(z.literal(""));

export const sensitiveSchema = z.object({
  salaryAmount: emptyOrValid(
    z
      .string()
      .regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Use an amount with at most 2 decimals"),
  ),
  salaryCurrency: emptyOrValid(
    z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter ISO currency code"),
  ),
  salaryFrequency: emptyOrValid(z.string().trim().min(1).max(30)),
  bankAccountNumber: emptyOrValid(
    z.string().refine(
      (v) => /^\d{9,18}$/.test(v),
      "Must be 9–18 digits"
    )
  ),
  bankName: emptyOrValid(z.string().min(1).max(100)),
  ifscCode: emptyOrValid(
    z.string().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Invalid IFSC code")
  ),
  pfUanNumber: emptyOrValid(
    z.string().regex(/^\d{12}$/, "UAN must be exactly 12 digits")
  ),
  esiIpNumber: emptyOrValid(z.string().max(20)),
  taxId: emptyOrValid(z.string().min(1).max(100)),
  panNumber: emptyOrValid(
    z.string().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, "Invalid PAN number")
  ),
  passportNumber: emptyOrValid(
    z.string().regex(/^[A-Za-z0-9]{6,9}$/, "Must be 6–9 alphanumeric characters")
  ),
  nationalId: emptyOrValid(z.string().min(1).max(100)),
});

export type SensitiveFormValues = z.infer<typeof sensitiveSchema>;

export function salaryCentsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function salaryInputToCents(value: string): number | null {
  if (value === "") return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function sensitiveToForm(data: HrSensitiveData | null | undefined): SensitiveFormValues {
  return {
    salaryAmount: salaryCentsToInput(data?.salaryAmountCents),
    salaryCurrency: data?.salaryCurrency ?? "",
    salaryFrequency: data?.salaryFrequency ?? "",
    bankAccountNumber: data?.bankDetails?.accountNumber ?? "",
    bankName: data?.bankDetails?.bankName ?? "",
    ifscCode: data?.bankDetails?.ifsc ?? "",
    pfUanNumber: data?.bankDetails?.pfUanNumber ?? "",
    esiIpNumber: data?.bankDetails?.esiIpNumber ?? "",
    taxId: data?.taxId ?? "",
    panNumber: data?.panNumber ?? "",
    passportNumber: data?.passportNumber ?? "",
    nationalId: data?.nationalId ?? "",
  };
}

export function formToSensitive(values: SensitiveFormValues, existing: HrSensitiveData | null | undefined): Partial<HrSensitiveData> {
  return {
    salaryAmountCents: salaryInputToCents(values.salaryAmount),
    salaryCurrency: values.salaryCurrency === "" ? null : values.salaryCurrency.toUpperCase(),
    salaryFrequency: values.salaryFrequency === "" ? null : values.salaryFrequency,
    bankDetails: {
      ...existing?.bankDetails,
      accountNumber: values.bankAccountNumber || undefined,
      bankName: values.bankName || undefined,
      ifsc: values.ifscCode || undefined,
      pfUanNumber: values.pfUanNumber || undefined,
      esiIpNumber: values.esiIpNumber || undefined,
    },
    taxId: values.taxId === "" ? null : values.taxId,
    panNumber: values.panNumber === "" ? null : values.panNumber,
    passportNumber: values.passportNumber === "" ? null : values.passportNumber,
    nationalId: values.nationalId === "" ? null : values.nationalId,
  };
}
