import { z } from "zod";
import { addDays, format, isMonday, isValid, nextMonday, parseISO } from "date-fns";

export const rosterSchema = z.object({
  name: z.string().trim().min(1, "Roster name is required"),
  weekStart: z
    .string()
    .min(1, { message: "Week start is required", abort: true })
    .refine((value) => isValid(parseISO(value)), { message: "Week start must be a date", abort: true })
    .refine((value) => isMonday(parseISO(value)), "Week start must be a Monday"),
});

export type RosterFormValues = z.infer<typeof rosterSchema>;

export function nextRosterMonday(today: Date): string {
  return format(isMonday(today) ? today : nextMonday(today), "yyyy-MM-dd");
}

export function rosterWeekEnd(weekStart: string): string {
  const start = parseISO(weekStart);
  return isValid(start) ? format(addDays(start, 6), "yyyy-MM-dd") : "";
}

export function isNotMonday(date: Date): boolean {
  return !isMonday(date);
}
