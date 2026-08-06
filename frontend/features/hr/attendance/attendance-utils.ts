import { activeAttendancePollInterval } from "@/lib/query-request-policies";

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
