import type { UpdateTimesheetSettingsInput } from "@/features/timesheets/types";

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
  "autoDraftFromAttendance",
] as const;

export type MaterialSettingField = (typeof MATERIAL_SETTING_FIELDS)[number];

const MATERIAL = new Set<string>(MATERIAL_SETTING_FIELDS);

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

export function materialChangesIn(changes: UpdateTimesheetSettingsInput): MaterialSettingField[] {
  return Object.keys(changes)
    .filter((key): key is MaterialSettingField => MATERIAL.has(key))
    .sort();
}

export function describeMaterialChanges(fields: readonly MaterialSettingField[]): string {
  const names = fields.map((f) => LABELS[f]);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  const last = names[names.length - 1] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}
