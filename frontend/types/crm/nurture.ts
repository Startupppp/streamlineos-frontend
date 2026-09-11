/**
 * The nurture engine's wire contract.
 *
 * Mirrored field for field from `autonomy/sequences/dto/nurture.schemas.ts` and
 * the four `NurtureSequencesService` view types. A step here carries a wait and
 * nothing else — no subject, no body, no recipient — because the message is
 * `composeAndHold`'s to write. Adding one of those fields to this file would
 * describe a route into the send path that does not exist.
 */

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

/**
 * The tightest cadence the sender can actually honour.
 *
 * Derived server-side in `nurture-cadence.ts` from `PARTY_FREQUENCY_CAPS` —
 * one send per 5 days and three per 30, the sparsest of which is one per 10 —
 * and copied here because no endpoint publishes it. That is a real duplication:
 * widening a cap on the server loosens the floor there and leaves this number
 * behind, so the screen would over-report the clamp rather than under-report
 * it. Erring in that direction is deliberate; a value below the true floor
 * would tell somebody a cadence sends when it never would.
 */
export const MIN_STEP_WAIT_HOURS = 240;

/** Ninety days, and the wire schema's own ceiling on `waitHours`. */
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
  /** As stored, already clamped by the server on the way in. */
  waitHours: number;
}

/** What `GET sequences/:nurtureSequenceId` answers: the record and its cadence. */
export interface NurtureSequenceDetail {
  sequence: NurtureSequenceSummary;
  steps: NurtureStep[];
}

export interface NurtureEnrollment {
  nurtureEnrollmentId: string;
  nurtureSequenceId: string;
  partyId: string;
  /**
   * Resolved server-side, in one query for the page. Null means the party is
   * gone — never that the reader may not see it, which is what a client-side
   * lookup could not tell apart.
   */
  partyName: string | null;
  dealId: number | null;
  dealName: string | null;
  status: NurtureEnrollmentStatus;
  /** How many steps have been attempted. 0 means none yet. */
  currentStep: number;
  exitReason: NurtureExitReason | null;
  exitedAt: string | null;
  enrolledAt: string;
}

/** `buildCursorPage`'s envelope. Keyset, because the sweep writes while you read. */
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
  /**
   * `draft` is absent on the wire too: a sequence that has run has enrolments
   * behind it, and calling it a draft again would describe it as never having.
   */
  status?: "active" | "paused";
}

export interface ReplaceNurtureStepsInput {
  steps: { waitHours: number }[];
}

export interface EnrolInNurtureSequenceInput {
  partyId: string;
  /** A string on the wire, digits only — the column is an integer FK to `deals`. */
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

/** `replied` first, because it is the number the whole feature is judged on. */
export const NURTURE_EXIT_REASON_LABELS: Record<NurtureExitReason, string> = {
  replied: "They replied",
  "sequence-paused": "The sequence was paused",
  "sequence-deleted": "The sequence was deleted",
  "manual-stop": "Stopped by hand",
  "no-steps": "The sequence had no steps",
};
