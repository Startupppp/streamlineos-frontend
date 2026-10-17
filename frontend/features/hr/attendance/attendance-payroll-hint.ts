export const ATTENDANCE_HINT_PREFIX = "Hint";

export function attendancePayrollHint(
  daysRemaining: number | null,
  cutoffLabel: string | null,
): string | null {
  if (daysRemaining === null || !cutoffLabel) return null;
  if (daysRemaining < 0) {
    return `${ATTENDANCE_HINT_PREFIX} · ${cutoffLabel} has passed. A correction landing now may affect LOP for the next cycle.`;
  }
  if (daysRemaining > 5) return null;
  const when = daysRemaining === 0 ? "closes today" : `closes in ${daysRemaining} days`;
  return `${ATTENDANCE_HINT_PREFIX} · ${cutoffLabel} ${when}. An unresolved punch may affect LOP.`;
}
