import { activeAttendancePollInterval } from "@/lib/query-request-policies";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface CalendarDay {
  date: Date;
  status: "present" | "wfh" | "leave" | "absent" | "weekend" | "holiday" | "future" | "none";
  holidayName?: string;
}

export const statusConfig = {
  present: { label: "Present", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300", dot: "bg-green-500" },
  wfh: { label: "WFH", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", dot: "bg-blue-500" },
  leave: { label: "Leave", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", dot: "bg-amber-500" },
  absent: { label: "Absent", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-300", dot: "bg-red-400" },
  weekend: { label: "Weekend", bg: "bg-muted/20", text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  holiday: { label: "Holiday", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", dot: "bg-blue-500" },
  future: { label: "", bg: "", text: "", dot: "" },
  none: { label: "", bg: "", text: "", dot: "" },
} as const;

export function formatDuration(hours: string | number | null | undefined): string {
  const h = typeof hours === "string" ? parseFloat(hours) : (hours ?? 0);
  if (h <= 0) return "0h 0m";
  const wholeHours = Math.floor(h);
  const minutes = Math.round((h - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatTimerSegment(val: number): string {
  return String(val).padStart(2, "0");
}

export function attendancePollInterval(
  data:
    | { todayLog?: { checkIn?: string | Date | null; checkOut?: string | Date | null } | null }
    | undefined,
): number | false {
  return activeAttendancePollInterval(data);
}
