import { z } from "zod";
import type { OrgSettings } from "@/types/organization";
import { CURRENCY_VALUES, MONTHS, toCurrencyCode } from "./org-localization-schema";

export const FISCAL_MONTH_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  MONTHS.map((label, index) => ({ value: String(index + 1), label }));

export const orgConfigSchema = z.object({
  timezone: z.string().min(1, "Select a timezone"),
  currency: z.enum(CURRENCY_VALUES),
  fiscalYearStart: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Select a month"),
  directoryPublic: z.boolean(),
});

export type OrgConfigValues = z.infer<typeof orgConfigSchema>;

export function toConfigValues(org: OrgSettings): OrgConfigValues {
  return {
    timezone: org.timezone ?? "Asia/Kolkata",
    currency: toCurrencyCode(org.currency),
    fiscalYearStart: String(org.fiscalYearStart ?? 4),
    directoryPublic: org.directoryPublic ?? false,
  };
}

export function fiscalMonthLabel(month: number | null | undefined): string {
  return MONTHS[(month ?? 4) - 1] ?? "April";
}
