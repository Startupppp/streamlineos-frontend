export const CREATE_REQUIRED_FIELDS = ["project", "description", "ticket"] as const;

export const SUBMIT_REQUIRED_FIELDS = ["description", "project"] as const;

export type RequiredField = (typeof CREATE_REQUIRED_FIELDS)[number];

const LABELS: Record<RequiredField, string> = {
  project: "Project",
  description: "Description",
  ticket: "Ticket",
};

const MESSAGES: Record<RequiredField, string> = {
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
