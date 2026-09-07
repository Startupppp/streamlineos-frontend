import { z } from "zod";

export const companySchema = z.object({
  baseCurrency: z.string().min(1),
  fiscalYearStartMonth: z.string().min(1),
  accountingBasis: z.enum(["ACCRUAL", "CASH"]),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export const taxSchema = z.object({
  gstin: z.string(),
  pan: z.string(),
  stateCode: z.string(),
});

export type TaxFormValues = z.infer<typeof taxSchema>;

export function isAccountingBasis(value: string): value is CompanyFormValues["accountingBasis"] {
  return value === "ACCRUAL" || value === "CASH";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readTaxRegistrationField(taxRegistration: unknown, key: string): string {
  if (!isRecord(taxRegistration)) return "";
  const value = taxRegistration[key];
  return typeof value === "string" ? value : "";
}

export function mergeTaxRegistration(
  taxRegistration: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(isRecord(taxRegistration) ? taxRegistration : {}), ...patch };
}
