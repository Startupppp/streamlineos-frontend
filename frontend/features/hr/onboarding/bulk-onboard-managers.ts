import type { BulkOnboardEmployeeRow } from "@/types/hr";
import { SECONDARY_MANAGER_COLUMNS } from "@/components/hr/reporting-lines/manager-columns";
import type { AssignedDefault } from "@/components/hr/reporting-lines/policy-default-primary";
import { defaultPrimaryConflictMessage } from "@/lib/validation/hr";
import { CONFLICT_KEY, EMAIL_RE, LEGACY_PRIMARY_KEY, type ParsedRow } from "./bulk-onboard-columns";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ManagerFields = Pick<
  BulkOnboardEmployeeRow,
  | "primaryManagerEmail"
  | "reportingManagerEmail"
  | "secondaryManagerEmail1"
  | "secondaryManagerEmail2"
  | "secondaryManagerEmail3"
  | "effectiveFrom"
  | "topLevelRole"
  | "topLevelRoleReason"
>;

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function read(row: ParsedRow, key: string): string {
  return (row[key] ?? "").trim();
}

export function validateManagerColumns(
  row: ParsedRow,
  employeeEmail: string,
  secondaryCap: number | null,
  assignedDefault: AssignedDefault | null = null,
): { errors: string[]; fields: ManagerFields } {
  const errors: string[] = [];
  const conflicts = read(row, CONFLICT_KEY);
  if (conflicts) {
    errors.push(`MANAGER_COLUMN_CONFLICT: two columns give different values for ${conflicts.split(",").join(", ")} — keep one`);
  }

  const primary = read(row, "primaryManagerEmail").toLowerCase();
  const secondaries = SECONDARY_MANAGER_COLUMNS.map((key) => read(row, key).toLowerCase());
  const topLevelRoleReason = read(row, "topLevelRoleReason");
  const effectiveFrom = read(row, "effectiveFrom");
  const named = [primary, ...secondaries].filter(Boolean);

  if (topLevelRoleReason && named.length > 0) {
    errors.push("a top-level role cannot also name a primary or secondary manager");
  }
  const cells: Array<[string, string]> = [
    ["primaryManagerEmail", primary],
    ...SECONDARY_MANAGER_COLUMNS.map((key, i): [string, string] => [key, secondaries[i] ?? ""]),
  ];
  for (const [label, value] of cells) {
    if (value && !EMAIL_RE.test(value)) errors.push(`invalid ${label}`);
  }
  if (employeeEmail && named.includes(employeeEmail)) {
    errors.push("an employee cannot be their own manager");
  }
  if (primary && secondaries.includes(primary)) {
    errors.push("a secondary manager duplicates the primary manager");
  }
  const defaultEmail = assignedDefault?.email?.toLowerCase();
  if (!primary && !topLevelRoleReason && assignedDefault && defaultEmail && secondaries.includes(defaultEmail)) {
    errors.push(defaultPrimaryConflictMessage(assignedDefault.name));
  }
  const filledSecondaries = secondaries.filter(Boolean);
  if (new Set(filledSecondaries).size !== filledSecondaries.length) {
    errors.push("the same secondary manager is listed twice");
  }
  if (secondaryCap !== null && filledSecondaries.length > secondaryCap) {
    errors.push(
      secondaryCap === 0
        ? "your organisation does not use secondary managers"
        : `this row names ${filledSecondaries.length} secondary managers; your organisation allows at most ${secondaryCap}`,
    );
  }
  if (effectiveFrom && !isIsoDate(effectiveFrom)) errors.push("invalid effectiveFrom (use YYYY-MM-DD)");

  const fields: ManagerFields = {
    ...(primary ? (read(row, LEGACY_PRIMARY_KEY) ? { reportingManagerEmail: primary } : { primaryManagerEmail: primary }) : {}),
    ...(secondaries[0] ? { secondaryManagerEmail1: secondaries[0] } : {}),
    ...(secondaries[1] ? { secondaryManagerEmail2: secondaries[1] } : {}),
    ...(secondaries[2] ? { secondaryManagerEmail3: secondaries[2] } : {}),
    ...(effectiveFrom ? { effectiveFrom } : {}),
    ...(topLevelRoleReason ? { topLevelRole: true, topLevelRoleReason } : {}),
  };
  return { errors, fields };
}
