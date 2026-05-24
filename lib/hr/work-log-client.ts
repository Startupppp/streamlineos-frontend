import { getTodayString } from "@/lib/date-utils";

/** Returns true if work logs can be edited for the given date (only today's date). */
export function isWorkLogDateEditable(dateStr: string): boolean {
  return dateStr === getTodayString();
}
