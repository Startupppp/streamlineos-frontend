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

export const REJECTION_NOTE_MAX_LENGTH = 2000;

export interface RejectionDetails {
  rejectionReason: RejectionReason;
  rejectionNote?: string;
}

export function isRejectionComplete(
  reason: RejectionReason | null,
  note: string,
): reason is RejectionReason {
  if (reason === null) return false;
  return reason !== "OTHER" || note.trim().length > 0;
}
