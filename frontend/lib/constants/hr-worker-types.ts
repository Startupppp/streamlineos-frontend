/**
 * BUG-HRMS-007. `hr_employments.worker_type` is a Postgres enum with a FULL_TIME
 * default. Keep these values identical to `hrWorkerTypeEnum` in the backend
 * schema — the onboarding payload is refused outright for anything else.
 */
export const HR_WORKER_TYPE_VALUES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "CONSULTANT",
  "INTERN",
  "TEMPORARY",
  "AGENCY",
  "FREELANCER",
] as const;

export type HrWorkerType = (typeof HR_WORKER_TYPE_VALUES)[number];

const WORKER_TYPE_LABELS: Record<HrWorkerType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contractor",
  CONSULTANT: "Consultant",
  INTERN: "Intern",
  TEMPORARY: "Temporary",
  AGENCY: "Agency",
  FREELANCER: "Freelancer",
};

export const HR_WORKER_TYPES = HR_WORKER_TYPE_VALUES.map((value) => ({
  value,
  label: WORKER_TYPE_LABELS[value],
}));

/** The column default, and what the wizard starts on. */
export const DEFAULT_HR_WORKER_TYPE = "FULL_TIME";

export function isHrWorkerType(value: string): value is HrWorkerType {
  return HR_WORKER_TYPE_VALUES.some((t) => t === value);
}

export function formatWorkerTypeLabel(value: string): string {
  return isHrWorkerType(value) ? WORKER_TYPE_LABELS[value] : value;
}
