/**
 * The org's `requiredFields` policy, mirrored from the server that enforces it.
 *
 * `entries.service.ts` refuses a create, and `periods.service.ts` refuses a
 * whole period submit, when a field named in this setting is empty. Neither
 * rule lives in a Zod schema — both are hand-written `if`s a dozen lines into
 * the service — so nothing about the request contract reveals them, and the
 * form that logs time never knew they existed.
 *
 * The two lists are deliberately different lengths: creating an entry is
 * checked against three fields, submitting a period against two. That is the
 * server's asymmetry, not a transcription slip, and `required-fields.test.ts`
 * reads both out of the backend to keep it that way.
 */

/** Checked by `entries.service.ts#createEntry`. */
export const CREATE_REQUIRED_FIELDS = ["project", "description", "ticket"] as const;

/** Checked by `periods.service.ts#submitPeriod`, over every entry in the period. */
export const SUBMIT_REQUIRED_FIELDS = ["description", "project"] as const;

export type RequiredField = (typeof CREATE_REQUIRED_FIELDS)[number];

const LABELS: Record<RequiredField, string> = {
  project: "Project",
  description: "Description",
  ticket: "Ticket",
};

const MESSAGES: Record<RequiredField, string> = {
  // A ticket satisfies the server's project rule, so the message has to offer both.
  project: "Your organisation requires a project or a ticket on every entry",
  description: "Your organisation requires a description on every entry",
  ticket: "Your organisation requires a ticket on every entry",
};

export function requiredFieldLabel(field: RequiredField): string {
  return LABELS[field];
}

export function requiredFieldMessage(field: RequiredField): string {
  return MESSAGES[field];
}

export interface EntryFieldValues {
  projectId: number | null;
  ticketId: number | null;
  description: string | null;
}

/**
 * Emptiness as the server sees it.
 *
 * The server tests `!input.description`, and the sheet sends
 * `values.description || undefined`, so a space is a description to both. That
 * is a poor policy, but tightening it here would refuse a save the server
 * accepts — which is the failure this whole file exists to undo, pointed the
 * other way.
 */
function missing(
  required: readonly string[],
  values: EntryFieldValues,
  field: RequiredField,
): boolean {
  if (!required.includes(field)) return false;
  if (field === "project") return !values.projectId && !values.ticketId;
  if (field === "ticket") return !values.ticketId;
  return !values.description;
}

export function missingOnCreate(
  required: readonly string[],
  values: EntryFieldValues,
): RequiredField[] {
  return CREATE_REQUIRED_FIELDS.filter((field) => missing(required, values, field));
}

export function missingOnSubmit(
  required: readonly string[],
  values: EntryFieldValues,
): RequiredField[] {
  return SUBMIT_REQUIRED_FIELDS.filter((field) => missing(required, values, field));
}
