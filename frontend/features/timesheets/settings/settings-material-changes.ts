import type { UpdateTimesheetSettingsInput } from "@/features/timesheets/types";

/**
 * The settings whose change the server will not accept without a reason.
 *
 * Mirrors `MATERIAL_FIELDS` in `timesheets/core/settings.service.ts`. TS-16 made
 * a justification mandatory for these and the form never grew a field to supply
 * one, so `PATCH /timesheets/settings` answered
 * `A changeReason is required when changing approvalMode` to a screen that had
 * no way to say why — and since every field this form edits is on the list,
 * that meant **no timesheet setting could be saved through the product at all**.
 *
 * Two lists rather than one shared constant because the repositories do not
 * share code, so the only protection against drift is that they are named the
 * same thing and this comment says where the other one lives. A field added
 * here but not there merely asks for a reason the server does not need; a field
 * added there but not here brings back the wall.
 *
 * `PAYROLL_FIELDS` are excluded server-side before this test runs and none of
 * them is editable on this form, so they are deliberately absent.
 */
export const MATERIAL_SETTING_FIELDS = [
  "workWeekStart",
  "requiredFields",
  "roundingRule",
  "maxHoursPerDay",
  "allowOverlappingEntries",
  "allowBackdatedEntries",
  "backdateLimitDays",
  "approvalMode",
  "clientApprovalEnabled",
  "lockAfterApproval",
  "lockAfterInvoice",
  "allowFutureEntries",
  "expectedDailyHours",
  "expectedWeeklyHours",
  "submissionGraceDays",
  /*
   * Not editable on this form — it is set elsewhere — but it is on the server's
   * list, and the drift guard compares the two lists whole. It found this one
   * missing on its first run.
   */
  "autoDraftFromAttendance",
] as const;

export type MaterialSettingField = (typeof MATERIAL_SETTING_FIELDS)[number];

const MATERIAL = new Set<string>(MATERIAL_SETTING_FIELDS);

/** Human labels, so the prompt names the policy rather than the column. */
const LABELS: Record<MaterialSettingField, string> = {
  workWeekStart: "week start",
  requiredFields: "required fields",
  roundingRule: "rounding rule",
  maxHoursPerDay: "maximum hours per day",
  allowOverlappingEntries: "overlapping entries",
  allowBackdatedEntries: "backdated entries",
  backdateLimitDays: "backdating limit",
  approvalMode: "approval mode",
  clientApprovalEnabled: "client approval",
  lockAfterApproval: "lock after approval",
  lockAfterInvoice: "lock after invoicing",
  allowFutureEntries: "future entries",
  expectedDailyHours: "expected daily hours",
  expectedWeeklyHours: "expected weekly hours",
  submissionGraceDays: "submission grace period",
  autoDraftFromAttendance: "drafting timesheets from attendance",
};

/**
 * Which of the pending changes are material.
 *
 * Read from the diff the form already computes rather than from the form's
 * dirty state, for the same reason the server reads it from stored values: a
 * field touched and put back is not a change, and demanding a justification for
 * pressing Save with nothing altered is a requirement people satisfy with a
 * full stop.
 */
export function materialChangesIn(changes: UpdateTimesheetSettingsInput): MaterialSettingField[] {
  return Object.keys(changes)
    .filter((key): key is MaterialSettingField => MATERIAL.has(key))
    .sort();
}

/** "approval mode and rounding rule" — an English list, not a JSON key dump. */
export function describeMaterialChanges(fields: readonly MaterialSettingField[]): string {
  const names = fields.map((f) => LABELS[f]);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  const last = names[names.length - 1] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}
