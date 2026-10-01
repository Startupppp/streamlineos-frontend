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
      "FORMULA_ERROR",
      "BELOW_MINIMUM_WAGE",
      "NEGATIVE_NET_PAY",
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

const CATEGORY_BY_KEY: Readonly<Record<ReadinessCategoryKey, ReadinessCategory>> =
  Object.fromEntries(READINESS_CATEGORIES.map((category) => [category.key, category])) as Record<
    ReadinessCategoryKey,
    ReadinessCategory
  >;

const KEY_BY_CODE: ReadonlyMap<string, ReadinessCategoryKey> = new Map(
  READINESS_CATEGORIES.flatMap((category) =>
    category.codes.map((code) => [code, category.key] as const),
  ),
);

export function readinessCategory(key: ReadinessCategoryKey): ReadinessCategory {
  return CATEGORY_BY_KEY[key];
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
