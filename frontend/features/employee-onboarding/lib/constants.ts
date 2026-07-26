import {
  WIZARD_COL_PAD,
  WIZARD_COL_PAD_X,
  WIZARD_COL_PAD_Y,
} from "@/components/wizard-shell";

export const ONBOARDING_COL_PAD_X = WIZARD_COL_PAD_X;
export const ONBOARDING_COL_PAD_Y = WIZARD_COL_PAD_Y;
export const ONBOARDING_COL_PAD = WIZARD_COL_PAD;

export const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  REVIEW: "finish",
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

export const ONBOARDING_SEQUENCE: readonly StepId[] = [
  STEP_IDS.PERSONAL,
  STEP_IDS.BANK,
  STEP_IDS.REVIEW,
];

export const STEP_TITLES: Record<StepId, string> = {
  personal: "Personal details",
  bank: "Bank & payroll",
  finish: "Review & submit",
};

export const STEP_SUBTITLES: Record<StepId, string> = {
  personal: "Phone, date of birth, home address, and emergency contact.",
  bank: "Account details HR needs to process payroll.",
  finish: "Confirm everything looks right, then send it to HR.",
};

export type StepGuide = {
  why: string;
  minutes: number;
};

export const STEP_GUIDE: Record<StepId, StepGuide> = {
  personal: {
    why: "This is how your profile will appear in People once HR has your record.",
    minutes: 2,
  },
  bank: {
    why: "Payroll details stay private — HR sees them on your employee file, not in the directory.",
    minutes: 2,
  },
  finish: {
    why: "After you submit, HR reviews this file while you explore the organization.",
    minutes: 1,
  },
};

export const ESTIMATED_MINUTES_REMAINING: Record<StepId, number> = {
  personal: 5,
  bank: 3,
  finish: 1,
};

export const DATA_STEP_IDS: readonly StepId[] = [
  STEP_IDS.PERSONAL,
  STEP_IDS.BANK,
];

const VALID_STEP_IDS: ReadonlySet<string> = new Set(ONBOARDING_SEQUENCE);

export function isStepId(value: string): value is StepId {
  return VALID_STEP_IDS.has(value);
}

export function stepIndexOf(id: StepId): number {
  return Math.max(0, ONBOARDING_SEQUENCE.indexOf(id));
}
