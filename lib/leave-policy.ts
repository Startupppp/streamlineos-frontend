
export const LEAVE_POLICY = {
  CASUAL: {
    name: "Casual Leave",
    daysPerYear: 12,
    perMonth: 1,
    carryForward: false,
    /** If true, a cron job expires unused monthly allocation */
    expiresMonthly: true,
  },
  SICK: {
    name: "Sick Leave",
    daysPerYear: 6,
    carryForward: false,
    expiresMonthly: false,
  },
} as const;

/** All default types (used when seeding leave_types for an org) */
export const DEFAULT_LEAVE_TYPES = [
  { name: LEAVE_POLICY.CASUAL.name, daysPerYear: LEAVE_POLICY.CASUAL.daysPerYear, carryForward: LEAVE_POLICY.CASUAL.carryForward },
  { name: LEAVE_POLICY.SICK.name, daysPerYear: LEAVE_POLICY.SICK.daysPerYear, carryForward: LEAVE_POLICY.SICK.carryForward },
] as const;

/**
 * Pro-rated casual-leave balance for a given calendar year.
 *
 * The employee receives 1 leave per remaining month (including the joining month).
 *
 * | Joins   | Month-index | Leaves |
 * |---------|-------------|--------|
 * | January | 0           | 12     |
 * | March   | 2           | 10     |
 * | December| 11          | 1      |
 *
 * If the joining year is *before* the target year the employee gets the full 12.
 * If the joining year is *after* the target year they get 0 (not yet active).
 */
export function calculateProratedCasualLeaves(
  joiningDate: Date | string,
  year: number,
): number {
  const d = typeof joiningDate === "string" ? new Date(joiningDate) : joiningDate;
  const joinYear = d.getFullYear();

  if (joinYear > year) return 0;
  if (joinYear < year) return LEAVE_POLICY.CASUAL.daysPerYear;
  const joiningMonth = d.getMonth();
  return LEAVE_POLICY.CASUAL.daysPerYear - joiningMonth;
}

/**
 * Sick-leave balance — always flat 6, regardless of joining date.
 */
export function getSickLeaveAllocation(): number {
  return LEAVE_POLICY.SICK.daysPerYear;
}

/**
 * Resolve the initial balance for any leave type based on the policy name.
 */
export function resolveInitialBalance(
  typeName: string,
  daysPerYear: number,
  joiningDate: Date | string,
  year: number,
): number {
  switch (typeName) {
    case LEAVE_POLICY.CASUAL.name:
      return calculateProratedCasualLeaves(joiningDate, year);
    case LEAVE_POLICY.SICK.name:
      return getSickLeaveAllocation();
    default:
      return daysPerYear;
  }
}
