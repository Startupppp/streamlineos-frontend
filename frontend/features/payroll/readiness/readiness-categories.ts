export const READINESS_CATEGORY_KEYS = [
  "attendance",
  "leave",
  "overtime",
  "joiners",
  "exits",
  "bank",
  "structure",
  "reimbursements",
  "fnf",
] as const;

export type ReadinessCategoryKey = (typeof READINESS_CATEGORY_KEYS)[number];

export type ReadinessCategorySource = "readiness" | "run" | "both" | "none";

export interface ReadinessCategory {
  readonly key: ReadinessCategoryKey;
  readonly label: string;
  readonly source: ReadinessCategorySource;
  readonly codes: readonly string[];
  readonly unmeasuredReason: string | null;
}

export const READINESS_CATEGORIES: readonly ReadinessCategory[] = [
  {
    key: "attendance",
    label: "Attendance",
    source: "both",
    codes: [
      "TIMESHEETS_AWAITING_APPROVAL",
      "APPROVED_HOURS_NOT_EXPORTED",
      "PERIOD_CHANGED_AFTER_EXPORT",
      "EXPORT_REJECTED",
      "MISSING_ATTENDANCE_INPUT",
      "NO_ATTENDANCE_FULL_MONTH_ASSUMED",
      "MISSING_LOCKED_INPUT_PERIOD",
      "INPUT_NOT_FROM_LOCKED_SNAPSHOT",
    ],
    unmeasuredReason: null,
  },
  {
    key: "leave",
    label: "Leave / LOP",
    source: "run",
    codes: ["LOP_EXCEEDS_SCHEDULED_DAYS"],
    unmeasuredReason: null,
  },
  {
    key: "overtime",
    label: "Overtime",
    source: "none",
    codes: [],
    unmeasuredReason:
      "No cycle endpoint reports overtime readiness. /hr/overtime lists requests org-wide with no month or cycle filter.",
  },
  {
    key: "joiners",
    label: "Joiners",
    source: "run",
    codes: ["MID_PERIOD_JOINER"],
    unmeasuredReason: null,
  },
  {
    key: "exits",
    label: "Exits",
    source: "run",
    codes: ["MID_PERIOD_EXIT"],
    unmeasuredReason: null,
  },
  {
    key: "bank",
    label: "Bank / KYC",
    source: "run",
    codes: ["MISSING_BANK_ACCOUNT", "DUPLICATE_BANK_ACCOUNT", "MISSING_PF_UAN", "MISSING_ESI_IP"],
    unmeasuredReason: null,
  },
  {
    key: "structure",
    label: "Structure",
    source: "run",
    codes: [
      "MISSING_SALARY_PROFILE",
      "NO_EARNING_COMPONENTS",
      "EMPTY_COMPONENT_LIST",
      "DUPLICATE_COMPONENT_ROLE",
      "GROSS_EXCEEDS_CTC",
      "FORMULA_ERROR",
      "BELOW_MINIMUM_WAGE",
      "NEGATIVE_NET_PAY",
      "NEGATIVE_DEDUCTION",
      "ZERO_NET_PAY",
      "MISSING_FX_RATE",
      "HIGH_VARIANCE",
      "SALARY_ON_HOLD",
      "PENDING_TAX_DECLARATION",
    ],
    unmeasuredReason: null,
  },
  {
    key: "reimbursements",
    label: "Reimbursements",
    source: "none",
    codes: [],
    unmeasuredReason:
      "No cycle endpoint reports reimbursement readiness. /hr/reimbursements pages a whole org with no cycle filter.",
  },
  {
    key: "fnf",
    label: "F&F",
    source: "none",
    codes: [],
    unmeasuredReason:
      "No cycle endpoint reports full-and-final readiness. /payroll/fnf lists settlements, which are not bound to a pay month.",
  },
];

const CATEGORY_BY_KEY: ReadonlyMap<ReadinessCategoryKey, ReadinessCategory> = new Map(
  READINESS_CATEGORIES.map((category) => [category.key, category]),
);

const KEY_BY_CODE: ReadonlyMap<string, ReadinessCategoryKey> = new Map(
  READINESS_CATEGORIES.flatMap((category) =>
    category.codes.map((code) => [code, category.key] as const),
  ),
);

export function readinessCategory(key: ReadinessCategoryKey): ReadinessCategory {
  const category = CATEGORY_BY_KEY.get(key);
  if (!category) throw new Error(`Unknown readiness category: ${key}`);
  return category;
}

export function categoryKeyForCode(code: string): ReadinessCategoryKey | null {
  return KEY_BY_CODE.get(code) ?? null;
}

export function categoryIsMeasured(
  category: ReadinessCategory,
  runBlockersAvailable: boolean,
): boolean {
  if (category.source === "none") return false;
  if (category.source === "readiness" || category.source === "both") return true;
  return runBlockersAvailable;
}

export const EXCEPTION_CODE_LABELS: Record<string, string> = {
  MISSING_SALARY_PROFILE: "No salary set for this employee",
  NO_EARNING_COMPONENTS: "Salary has no earning components",
  MISSING_BANK_ACCOUNT: "Bank account missing",
  DUPLICATE_BANK_ACCOUNT: "Same bank account used by two people",
  NEGATIVE_NET_PAY: "Deductions are more than pay",
  NEGATIVE_DEDUCTION: "A deduction is negative",
  ZERO_NET_PAY: "Take-home pay is zero",
  SALARY_ON_HOLD: "Salary is on hold",
  MISSING_ATTENDANCE_INPUT: "No attendance input for this month",
  NO_ATTENDANCE_FULL_MONTH_ASSUMED: "No attendance recorded; full month assumed",
  MISSING_LOCKED_INPUT_PERIOD: "Attendance for this month isn't locked yet",
  INPUT_NOT_FROM_LOCKED_SNAPSHOT: "Inputs changed after attendance was locked",
  LOP_EXCEEDS_SCHEDULED_DAYS: "Loss-of-pay days exceed working days",
  FORMULA_ERROR: "A salary formula could not be calculated",
  HIGH_VARIANCE: "Pay changed a lot from last month",
  MISSING_FX_RATE: "Exchange rate missing",
  BELOW_MINIMUM_WAGE: "Pay is below minimum wage",
  PENDING_TAX_DECLARATION: "Tax declaration pending",
  MID_PERIOD_JOINER: "Joined mid-month",
  MID_PERIOD_EXIT: "Left mid-month",
  EMPTY_COMPONENT_LIST: "Salary has no components",
  DUPLICATE_COMPONENT_ROLE: "Two components play the same role",
  GROSS_EXCEEDS_CTC: "Monthly pay is higher than the agreed salary",
  MISSING_PF_UAN: "PF UAN missing",
  MISSING_ESI_IP: "ESI number missing",
};

export function exceptionCodeLabel(code: string): string {
  return EXCEPTION_CODE_LABELS[code] ?? code.replaceAll("_", " ").toLowerCase();
}
