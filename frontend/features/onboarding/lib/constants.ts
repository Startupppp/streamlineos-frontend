export const ONBOARDING_COL_PAD_X = "px-4 sm:px-6 md:px-8 lg:px-10";

export const ONBOARDING_COL_PAD_Y = "py-3 sm:py-4 md:py-5 lg:py-6";

export const ONBOARDING_COL_PAD =
  ONBOARDING_COL_PAD_X + " " + ONBOARDING_COL_PAD_Y;

export const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  DOCS: "docs",
  REVIEW: "finish",
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

export const ONBOARDING_SEQUENCE: readonly StepId[] = [
  STEP_IDS.PERSONAL,
  STEP_IDS.BANK,
  STEP_IDS.DOCS,
  STEP_IDS.REVIEW,
];

export const STEP_TITLES: Record<StepId, string> = {
  personal: "Personal details",
  bank: "Bank & payroll",
  docs: "ID & documents",
  finish: "Review & submit",
};

export const STEP_SUBTITLES: Record<StepId, string> = {
  personal: "Phone, date of birth, home address, and emergency contact.",
  bank: "Account details HR needs to process payroll.",
  docs: "Upload identity and employment documents for verification.",
  finish: "Confirm everything looks right, then send it to HR.",
};

export const ESTIMATED_MINUTES_REMAINING: Record<StepId, number> = {
  personal: 6,
  bank: 4,
  docs: 3,
  finish: 1,
};

export const DATA_STEP_IDS: readonly StepId[] = [
  STEP_IDS.PERSONAL,
  STEP_IDS.BANK,
  STEP_IDS.DOCS,
];

const VALID_STEP_IDS: ReadonlySet<string> = new Set(ONBOARDING_SEQUENCE);

export function isStepId(value: string): value is StepId {
  return VALID_STEP_IDS.has(value);
}

export function stepIndexOf(id: StepId): number {
  return Math.max(0, ONBOARDING_SEQUENCE.indexOf(id));
}
