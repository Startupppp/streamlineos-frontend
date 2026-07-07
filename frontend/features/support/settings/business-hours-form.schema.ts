import { z } from "zod";
import type {
  BusinessHours, BusinessHoursDay, CreateBusinessHoursInput,
} from "@/hooks/api/support/business-hours";

export const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
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

export const DAY_ORDER: BusinessHoursDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<BusinessHoursDay, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const dayScheduleSchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});

export const businessHoursSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  timezone: z.string().min(1, "Required"),
  is24x7: z.boolean(),
  isDefault: z.boolean(),
  mon: dayScheduleSchema,
  tue: dayScheduleSchema,
  wed: dayScheduleSchema,
  thu: dayScheduleSchema,
  fri: dayScheduleSchema,
  sat: dayScheduleSchema,
  sun: dayScheduleSchema,
  holidays: z.array(z.string()),
});
export type BusinessHoursForm = z.infer<typeof businessHoursSchema>;

function defaultDaySchedule(enabled: boolean) {
  return { enabled, start: "09:00", end: "17:00" };
}

export const DEFAULT_FORM_VALUES: BusinessHoursForm = {
  name: "",
  timezone: "UTC",
  is24x7: false,
  isDefault: false,
  mon: defaultDaySchedule(true),
  tue: defaultDaySchedule(true),
  wed: defaultDaySchedule(true),
  thu: defaultDaySchedule(true),
  fri: defaultDaySchedule(true),
  sat: defaultDaySchedule(false),
  sun: defaultDaySchedule(false),
  holidays: [],
};

export function businessHoursToFormValues(bh: BusinessHours): BusinessHoursForm {
  return {
    name: bh.name,
    timezone: bh.timezone,
    is24x7: bh.is24x7,
    isDefault: bh.isDefault,
    mon: bh.weeklySchedule.mon ? { enabled: true, ...bh.weeklySchedule.mon } : defaultDaySchedule(false),
    tue: bh.weeklySchedule.tue ? { enabled: true, ...bh.weeklySchedule.tue } : defaultDaySchedule(false),
    wed: bh.weeklySchedule.wed ? { enabled: true, ...bh.weeklySchedule.wed } : defaultDaySchedule(false),
    thu: bh.weeklySchedule.thu ? { enabled: true, ...bh.weeklySchedule.thu } : defaultDaySchedule(false),
    fri: bh.weeklySchedule.fri ? { enabled: true, ...bh.weeklySchedule.fri } : defaultDaySchedule(false),
    sat: bh.weeklySchedule.sat ? { enabled: true, ...bh.weeklySchedule.sat } : defaultDaySchedule(false),
    sun: bh.weeklySchedule.sun ? { enabled: true, ...bh.weeklySchedule.sun } : defaultDaySchedule(false),
    holidays: bh.holidays,
  };
}

export function buildMutationPayload(data: BusinessHoursForm): CreateBusinessHoursInput {
  const weeklySchedule: Partial<Record<BusinessHoursDay, { start: string; end: string }>> = {};
  for (const day of DAY_ORDER) {
    const schedule = data[day];
    if (schedule.enabled) weeklySchedule[day] = { start: schedule.start, end: schedule.end };
  }
  return {
    name: data.name,
    timezone: data.timezone,
    is24x7: data.is24x7,
    isDefault: data.isDefault,
    weeklySchedule,
    holidays: data.holidays,
  };
}
