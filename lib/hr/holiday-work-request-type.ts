export type HolidayWorkRequestType = "HOLIDAY" | "SUNDAY" | "SATURDAY";

export type ResolveHolidayWorkRequestTypeResult =
  | { ok: true; type: HolidayWorkRequestType; isHrHoliday: boolean }
  | { ok: false; reason: "not_a_non_working_day" };

/**
 * Pure resolver used by POST /api/hr/holiday-work-requests. Decides whether
 * `requestDate` is eligible for a holiday-work request and what type label to
 * stamp on the row.
 *
 * Precedence: HR-added holiday wins over weekend (so a Sunday added as a
 * named holiday like "Diwali" is reported as HOLIDAY, not SUNDAY). This
 * mirrors what users expect when they see the slip on the dashboard.
 *
 * Date string is yyyy-mm-dd; we anchor to T00:00:00 in the runtime's local
 * tz which is fine because the request payload is the user's intended
 * calendar date — the day-of-week is a property of that date string and
 * doesn't depend on time-of-day.
 */
export function resolveHolidayWorkRequestType(
  requestDateYyyyMmDd: string,
  matchedHrHoliday: { id: number } | null | undefined
): ResolveHolidayWorkRequestTypeResult {
  const d = new Date(requestDateYyyyMmDd + "T00:00:00");
  const dow = d.getDay();
  const isSunday = dow === 0;
  const isSaturday = dow === 6;
  const isHrHoliday = !!matchedHrHoliday;

  if (!isHrHoliday && !isSunday && !isSaturday) {
    return { ok: false, reason: "not_a_non_working_day" };
  }

  const type: HolidayWorkRequestType = isHrHoliday ? "HOLIDAY" : isSunday ? "SUNDAY" : "SATURDAY";
  return { ok: true, type, isHrHoliday };
}
