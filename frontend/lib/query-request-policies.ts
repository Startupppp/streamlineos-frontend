export const ACTIVE_ATTENDANCE_POLL_INTERVAL_MS = 60_000;
export const NOTIFICATION_FALLBACK_INTERVAL_MS = 5 * 60_000;
export const DAILY_DATA_STALE_TIME_MS = 12 * 60 * 60_000;

export function activeAttendancePollInterval(
  data:
    | {
        todayLog?: {
          checkIn?: string | Date | null;
          checkOut?: string | Date | null;
        } | null;
      }
    | undefined,
): number | false {
  return data?.todayLog?.checkIn && !data.todayLog.checkOut
    ? ACTIVE_ATTENDANCE_POLL_INTERVAL_MS
    : false;
}

export function requestBudgetForWindow(
  interval: number | false,
  durationMs: number,
): number {
  if (interval === false) return 1;
  return 1 + Math.floor(durationMs / interval);
}
