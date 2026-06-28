
export const WFH_MONTHLY_QUOTA = 4;

export const LEAVE_POLICY = {
  CASUAL: {
    name: "Casual Leave",
    daysPerYear: 12,
    perMonth: 1,
    carryForward: false,
    expiresMonthly: true,
  },
  SICK: {
    name: "Sick Leave",
    daysPerYear: 6,
    carryForward: false,
    expiresMonthly: false,
  },
  UNPAID: {
    name: "Unpaid Leave",
    daysPerYear: 0,
    carryForward: false,
    expiresMonthly: false,
  },
} as const;

export const ALLOWED_LEAVE_TYPE_NAMES: ReadonlySet<string> = new Set([
  LEAVE_POLICY.CASUAL.name,
  LEAVE_POLICY.SICK.name,
  LEAVE_POLICY.UNPAID.name,
]);

export const LEAVE_MAX_DAYS: Record<string, number> = {
  [LEAVE_POLICY.SICK.name]: LEAVE_POLICY.SICK.daysPerYear,
  [LEAVE_POLICY.CASUAL.name]: LEAVE_POLICY.CASUAL.daysPerYear,
};

