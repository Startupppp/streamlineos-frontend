
export const NURTURE_SEQUENCE_STATUSES = ["draft", "active", "paused"] as const;
export type NurtureSequenceStatus = (typeof NURTURE_SEQUENCE_STATUSES)[number];

export const NURTURE_ENROLLMENT_STATUSES = [
  "active",
  "completed",
  "exited",
  "failed",
] as const;
export type NurtureEnrollmentStatus = (typeof NURTURE_ENROLLMENT_STATUSES)[number];

export const NURTURE_EXIT_REASONS = [
  "replied",
  "sequence-paused",
  "sequence-deleted",
  "manual-stop",
  "no-steps",
] as const;
export type NurtureExitReason = (typeof NURTURE_EXIT_REASONS)[number];

export const MIN_STEP_WAIT_HOURS = 240;

export const MAX_STEP_WAIT_HOURS = 90 * 24;

export const MAX_SEQUENCE_STEPS = 12;

export interface NurtureSequenceSummary {
  nurtureSequenceId: string;
  name: string;
  description: string | null;
  status: NurtureSequenceStatus;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NurtureStep {
  nurtureStepId: string;
  stepNumber: number;
  waitHours: number;
}

export interface NurtureSequenceDetail {
  sequence: NurtureSequenceSummary;
  steps: NurtureStep[];
}

export interface NurtureEnrollment {
  nurtureEnrollmentId: string;
  nurtureSequenceId: string;
  partyId: string;
  partyName: string | null;
  dealId: number | null;
  dealName: string | null;
  status: NurtureEnrollmentStatus;
  currentStep: number;
  exitReason: NurtureExitReason | null;
  exitedAt: string | null;
  enrolledAt: string;
}

export interface NurtureCursorPage<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface CreateNurtureSequenceInput {
  name: string;
  description?: string;
}

export interface UpdateNurtureSequenceInput {
  name?: string;
  description?: string | null;
  status?: "active" | "paused";
}

export interface ReplaceNurtureStepsInput {
  steps: { waitHours: number }[];
}

export interface EnrolInNurtureSequenceInput {
  partyId: string;
  dealId?: string;
}

export interface NurtureSequenceRemoved {
  deleted: true;
  exitedEnrollments: number;
}

export const NURTURE_SEQUENCE_STATUS_LABELS: Record<NurtureSequenceStatus, string> = {
  draft: "Draft",
  active: "Running",
  paused: "Paused",
};

export const NURTURE_ENROLLMENT_STATUS_LABELS: Record<NurtureEnrollmentStatus, string> = {
  active: "In the cadence",
  completed: "Finished",
  exited: "Stopped early",
  failed: "Failed",
};

export const NURTURE_EXIT_REASON_LABELS: Record<NurtureExitReason, string> = {
  replied: "They replied",
  "sequence-paused": "The sequence was paused",
  "sequence-deleted": "The sequence was deleted",
  "manual-stop": "Stopped by hand",
  "no-steps": "The sequence had no steps",
};
