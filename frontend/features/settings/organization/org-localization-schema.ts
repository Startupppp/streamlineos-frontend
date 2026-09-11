import { z } from "zod";

export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
] as const;

export const CURRENCY_VALUES = ["USD", "EUR", "INR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"] as const;

export const CURRENCIES: ReadonlyArray<{ value: (typeof CURRENCY_VALUES)[number]; label: string }> = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "ja", label: "Japanese" },
] as const;

export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (31-Dec-2026)" },
] as const;

export const TIME_FORMATS = [
  { value: "12h", label: "12-hour (2:30 PM)" },
  { value: "24h", label: "24-hour (14:30)" },
] as const;

export const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56 (comma thousands, period decimal)" },
  { value: "1.234,56", label: "1.234,56 (period thousands, comma decimal)" },
  { value: "1 234.56", label: "1 234.56 (space thousands, period decimal)" },
] as const;

export const WEEK_START_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
  { value: "saturday", label: "Saturday" },
] as const;

export const TIME_FORMAT_VALUES = ["12h", "24h"] as const;
export const WEEK_START_DAY_VALUES = ["monday", "sunday", "saturday"] as const;

export const localizationSchema = z.object({
  timezone: z.string().min(1),
  currency: z.enum(CURRENCY_VALUES),
  fiscalYearStart: z.number().int().min(1).max(12),
  language: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(TIME_FORMAT_VALUES),
  numberFormat: z.string().min(1),
  weekStartDay: z.enum(WEEK_START_DAY_VALUES),
});

export type LocalizationValues = z.infer<typeof localizationSchema>;

export function toCurrencyCode(value: string | null | undefined): (typeof CURRENCY_VALUES)[number] {
  return CURRENCY_VALUES.find((c) => c === value) ?? "INR";
}

export function extractLocalizationSettings(settings: Record<string, unknown> | null | undefined): {
  language: string;
  dateFormat: string;
  timeFormat: (typeof TIME_FORMAT_VALUES)[number];
  numberFormat: string;
  weekStartDay: (typeof WEEK_START_DAY_VALUES)[number];
} {
  const timeFormat =
    TIME_FORMAT_VALUES.find((candidate) => candidate === settings?.timeFormat) ?? "12h";
  const weekStartDay =
    WEEK_START_DAY_VALUES.find((candidate) => candidate === settings?.weekStartDay) ?? "monday";
  return {
    language: typeof settings?.language === "string" ? settings.language : "en",
    dateFormat: typeof settings?.dateFormat === "string" ? settings.dateFormat : "DD/MM/YYYY",
    timeFormat,
    numberFormat: typeof settings?.numberFormat === "string" ? settings.numberFormat : "1,234.56",
    weekStartDay,
  };
}
