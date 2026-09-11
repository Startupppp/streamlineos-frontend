import { z } from "zod";
import type { OrgSettings } from "@/types/organization";

export const BUSINESS_DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const;

export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z.object({
  open: z.string().regex(TIME_OF_DAY, "Enter a valid time"),
  close: z.string().regex(TIME_OF_DAY, "Enter a valid time"),
  enabled: z.boolean(),
});

export const businessHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

export type BusinessHoursValues = z.infer<typeof businessHoursSchema>;
export type BusinessDayKey = keyof BusinessHoursValues;

export const DEFAULT_BUSINESS_HOURS: BusinessHoursValues = {
  monday: { open: "09:00", close: "18:00", enabled: true },
  tuesday: { open: "09:00", close: "18:00", enabled: true },
  wednesday: { open: "09:00", close: "18:00", enabled: true },
  thursday: { open: "09:00", close: "18:00", enabled: true },
  friday: { open: "09:00", close: "18:00", enabled: true },
  saturday: { open: "09:00", close: "14:00", enabled: false },
  sunday: { open: "09:00", close: "14:00", enabled: false },
};

function toTime(value: unknown, fallback: string): string {
  return typeof value === "string" && TIME_OF_DAY.test(value) ? value : fallback;
}

export function mergeBusinessHours(
  saved: OrgSettings["businessHours"],
): BusinessHoursValues {
  const result = { ...DEFAULT_BUSINESS_HOURS };
  if (!saved) return result;
  for (const day of BUSINESS_DAYS) {
    const stored = saved[day.key];
    if (!stored) continue;
    const fallback = DEFAULT_BUSINESS_HOURS[day.key];
    result[day.key] = {
      open: toTime(stored.open, fallback.open),
      close: toTime(stored.close, fallback.close),
      enabled: stored.enabled ?? false,
    };
  }
  return result;
}
