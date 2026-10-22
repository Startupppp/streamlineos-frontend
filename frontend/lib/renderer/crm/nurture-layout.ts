import type { RecordLayout, SelectOption } from "../layout";
import { formatShortDate } from "@/lib/date-utils";
import {
  NURTURE_EXIT_REASON_LABELS,
  type NurtureEnrollment,
  type NurtureSequenceSummary,
} from "@/types/crm/nurture";


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
