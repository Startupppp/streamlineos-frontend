/**
 * The rejection reasons the API accepts, mirroring
 * `modules/hr/recruitment/disposition/rejection-reasons.ts` in the backend.
 *
 * Codes cross the wire and labels never do. A label is prose a hiring team
 * rewrites, and a stored label would make last quarter's rows stop matching
 * this quarter's the first time somebody reworded one — so the picker sends the
 * code and renders the label, and the two are kept in one file so a new code
 * cannot ship without display text (the `Record` below will not compile).
 *
 * The backend's own catalog is the authority: a code missing here is a reason
 * a recruiter cannot pick, and a code invented here is refused with a 422
 * naming the list.
 */
export const REJECTION_REASONS = [
  "SKILLS_MISMATCH",
  "EXPERIENCE_MISMATCH",
  "COMPENSATION",
  "LOCATION",
  "NOTICE_PERIOD",
  "WITHDREW",
  "POSITION_CLOSED",
  "FAILED_ASSESSMENT",
  "BACKGROUND_CHECK",
  "DUPLICATE",
  "OTHER",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** Display text only. Nothing persists these, so rewording one is free. */
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  SKILLS_MISMATCH: "Skills mismatch",
  EXPERIENCE_MISMATCH: "Experience mismatch",
  COMPENSATION: "Compensation expectations",
  LOCATION: "Location or relocation",
  NOTICE_PERIOD: "Notice period",
  WITHDREW: "Candidate withdrew",
  POSITION_CLOSED: "Position closed or on hold",
  FAILED_ASSESSMENT: "Did not clear assessment",
  BACKGROUND_CHECK: "Background check",
  DUPLICATE: "Duplicate record",
  OTHER: "Other",
};

/** Matches the backend bound, so an over-long note is stopped before the request. */
export const REJECTION_NOTE_MAX_LENGTH = 2000;

/**
 * What a reject request carries beyond the stage itself.
 *
 * Declared here rather than beside the dialog so the mutation hooks can take it
 * without a hook importing from a feature — and so a second reject control, if
 * one is ever added, has the shape to fill rather than a new one to invent.
 */
export interface RejectionDetails {
  rejectionReason: RejectionReason;
  rejectionNote?: string;
}

/**
 * What the reject control must collect before the request may be sent.
 *
 * `OTHER` needs its note or the catalog stops meaning anything: one click and
 * every rejection is "Other" again. The backend refuses the same pair, so this
 * only decides whether the button is enabled — it is not the guard.
 */
export function isRejectionComplete(
  reason: RejectionReason | null,
  note: string,
): reason is RejectionReason {
  if (reason === null) return false;
  return reason !== "OTHER" || note.trim().length > 0;
}
