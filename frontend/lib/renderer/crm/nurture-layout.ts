import type { RecordLayout, SelectOption } from "../layout";
import { formatShortDate } from "@/lib/date-utils";
import {
  NURTURE_EXIT_REASON_LABELS,
  type NurtureEnrollment,
  type NurtureSequenceSummary,
} from "@/types/crm/nurture";

/**
 * A nurture cadence and who is inside it, as data.
 *
 * Two descriptions, because they are two record types behind two endpoints —
 * the same split `settings/sequence-layout.ts` makes for outreach sequences,
 * and for the same reason: a sequence is authored, an enrolment happens to
 * somebody.
 *
 * The status tones are the ones `nurture-status-badge.tsx` carried as two
 * `Record<Status, StatusTone>` maps beside the tables that used them. Moving
 * them into the descriptions is what lets a status render identically wherever
 * the record does, and it puts the one judgement in those maps somewhere it can
 * be read: `completed` is neutral rather than a success, because a cadence that
 * ran to the end without the customer ever answering is not a win. `replied` is
 * the outcome this feature is judged on, and colouring "ran out of steps" green
 * would put the two on the same footing.
 */

const SEQUENCE_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "active", label: "Running", tone: "success" },
  { value: "paused", label: "Paused", tone: "warning" },
];

const ENROLLMENT_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "active", label: "In the cadence", tone: "info" },
  { value: "completed", label: "Finished", tone: "neutral" },
  { value: "exited", label: "Stopped early", tone: "neutral" },
  { value: "failed", label: "Failed", tone: "danger" },
];

/**
 * The cadence itself.
 *
 * `status` is read-only here and that is the record's own shape rather than an
 * omission: pausing a sequence stops the enrolments already inside it, not just
 * new ones, so it is a decision taken while looking at who is in it — an action
 * on the record, offered on its page, not a control in a list's form. What a
 * form over this record edits is what it is called and what it is for.
 *
 * `stepCount` carries no `sign`. It is a quantity that never goes below zero, so
 * a sign would tint every non-empty sequence one colour and reserve neutral for
 * the empty one — the trap `deal-aging-layout.ts` documents.
 */
export const NURTURE_SEQUENCE_LAYOUT: RecordLayout = {
  key: "crm:nurture-sequence",
  singular: "Sequence",
  plural: "Nurture sequences",
  titleField: "name",
  fields: [
    { name: "name", label: "Sequence", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: SEQUENCE_STATUS_OPTIONS,
    },
    { name: "stepCount", label: "Steps", kind: "number", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search nurture sequences…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "status", width: "w-32 shrink-0" },
      { field: "stepCount", width: "w-20 shrink-0" },
      { field: "createdAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Sequence", fields: ["name", "status", "stepCount", "createdAt"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: { sections: [{ title: "Sequence", fields: ["name", "description"] }] },
};

/**
 * Somebody moving through a cadence, or everybody who has left one.
 *
 * Read-only throughout: the only thing anybody does to an enrolment is stop it,
 * and stopping is an action on a row rather than a field on a form.
 *
 * `progress` is text that is aligned like a figure. "3 / 5" is a pair — how far
 * through, out of how many steps the sequence currently has — and `numeric`
 * exists so a description can say "line this column up" without claiming the
 * value is a number that could be summed or given a sign.
 *
 * `outcome` states why an enrolment ended and when, in one field, because the
 * two are one fact: `replied` last Tuesday is the answer, and a bare date in a
 * column of its own would be a second column that is empty for everybody still
 * in the cadence.
 */
export const NURTURE_ENROLLMENT_LAYOUT: RecordLayout = {
  key: "crm:nurture-enrollment",
  singular: "Enrolment",
  plural: "Enrolments",
  titleField: "party",
  fields: [
    { name: "party", label: "Customer", kind: "text", readOnly: true },
    { name: "deal", label: "Deal", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: ENROLLMENT_STATUS_OPTIONS,
    },
    { name: "progress", label: "Steps done", kind: "text", numeric: true, readOnly: true },
    { name: "enrolledAt", label: "Enrolled", kind: "date", readOnly: true },
    { name: "outcome", label: "Why it ended", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search enrolments…",
    columns: [
      { field: "party", primary: true },
      { field: "deal", width: "min-w-[140px]" },
      { field: "status", width: "w-36 shrink-0" },
      { field: "progress", width: "w-24 shrink-0" },
      { field: "enrolledAt", width: "w-32 shrink-0" },
      { field: "outcome", width: "min-w-[180px]" },
    ],
  },
  detail: {
    sections: [
      { title: "Enrolment", fields: ["party", "deal", "status"] },
      { title: "Progress", fields: ["progress", "enrolledAt", "outcome"] },
    ],
  },
  form: { sections: [] },
};

/** One sequence in the shape the description names. */
export function nurtureSequenceRecordFields(
  sequence: NurtureSequenceSummary,
): Record<string, unknown> {
  return {
    nurtureSequenceId: sequence.nurtureSequenceId,
    name: sequence.name,
    description: sequence.description,
    status: sequence.status,
    stepCount: sequence.stepCount,
    createdAt: sequence.createdAt,
  };
}

/**
 * One enrolment in the shape the description names.
 *
 * The three absences are answered here rather than in a cell, and each says
 * something different. A null `partyName` means the party is gone — never that
 * the reader may not see it, which is what a client-side lookup could not tell
 * apart, and which is why `listEnrollments` resolves the whole page server-side.
 * A null `dealId` means the enrolment was never attached to one. A `dealId` with
 * no name means the deal has since been removed.
 *
 * `stepCount` is the sequence's, not the enrolment's: how far through somebody
 * is only means anything against how many steps there are, and that number
 * lives on the record above this one.
 */
export function nurtureEnrollmentRecordFields(
  enrollment: NurtureEnrollment,
  stepCount: number,
): Record<string, unknown> {
  const exitedOn = enrollment.exitedAt ? formatShortDate(enrollment.exitedAt) : "";
  const reason = enrollment.exitReason
    ? (NURTURE_EXIT_REASON_LABELS[enrollment.exitReason] ?? enrollment.exitReason)
    : "";

  return {
    nurtureEnrollmentId: enrollment.nurtureEnrollmentId,
    party: enrollment.partyName ?? "A customer who has been removed",
    deal:
      enrollment.dealId === null
        ? "No deal"
        : (enrollment.dealName ?? "A deal that has been removed"),
    status: enrollment.status,
    progress: `${enrollment.currentStep} / ${stepCount}`,
    enrolledAt: enrollment.enrolledAt,
    outcome: reason && exitedOn ? `${reason} · ${exitedOn}` : reason,
  };
}
