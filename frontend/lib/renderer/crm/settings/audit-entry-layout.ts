import type { RecordLayout, SelectOption } from "../../layout";

/**
 * An audit entry, as data.
 *
 * An audit log is a record list and not a timeline, whatever it looked like. A
 * timeline is a narrative about one thing — this deal, then this, then this —
 * and it is read downward. An audit log is a filterable, paginated table of who
 * did what to which record, read across: the questions asked of it are "what did
 * this person change", "what happened to quotes last Tuesday", "who deleted
 * that", and every one of them is a column and a filter. The surface it replaces
 * drew avatar bubbles joined by a vertical rule, which is a timeline's chrome
 * spent on a table's job — and it cost the reader the ability to scan a column.
 *
 * The sentence that card wrote under each entry — "created Lead", "changed
 * status of Deal" — is gone rather than translated, because it restated the
 * action badge and the entity badge beside it in prose. Three renderings of one
 * fact is not emphasis.
 *
 * Time is absolute here where the card showed "2 hours ago" with the real
 * instant hidden in a tooltip. An audit log is read to establish when something
 * happened, and a relative time cannot answer that; it is also the one column
 * whose values must line up to be scanned, which a phrase does not.
 */

/** What a change to a record was. Tones are the status tokens, never a colour. */
const ACTION_OPTIONS: readonly SelectOption[] = [
  { value: "created", label: "Created", tone: "success" },
  { value: "updated", label: "Updated", tone: "info" },
  { value: "deleted", label: "Deleted", tone: "danger" },
  { value: "archived", label: "Archived", tone: "neutral" },
  { value: "restored", label: "Restored", tone: "success" },
  { value: "assigned", label: "Assigned", tone: "info" },
  { value: "unassigned", label: "Unassigned", tone: "info" },
  { value: "status_changed", label: "Status changed", tone: "warning" },
  { value: "stage_changed", label: "Stage changed", tone: "warning" },
  { value: "converted", label: "Converted", tone: "info" },
  { value: "merged", label: "Merged", tone: "info" },
  { value: "exported", label: "Exported", tone: "info" },
  { value: "imported", label: "Imported", tone: "info" },
];

/*
  What was changed, with no tone at all. An entity type is not a status, and
  colouring it would spend the status palette on decoration — after which a
  genuine warning has nothing left to say.
*/
const TARGET_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "lead", label: "Lead" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "deal", label: "Deal" },
  { value: "task", label: "Task" },
  { value: "quote", label: "Quote" },
  { value: "user", label: "User" },
  { value: "settings", label: "Settings" },
];

/** The audit row, as much of it as the description names. */
export interface AuditEntryRecord {
  readonly id: number;
  readonly action: string;
  readonly userName: string | null;
  readonly userEmail: string | null;
  readonly targetType: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly ipAddress: string | null;
  readonly createdAt: Date | string;
}

function isChange(value: unknown): value is { from: unknown; to: unknown } {
  return typeof value === "object" && value !== null && "from" in value;
}

/** How many changes fit in a cell before the rest become a count. */
const CHANGES_SHOWN = 3;

/**
 * What actually changed, as one line.
 *
 * The card this replaces rendered each field as a struck-through old value in
 * red and a new one in green, stacked. The engine has no diff kind and this is
 * not the place to invent one: what a description can say is that the field is
 * text, and the arrow carries the direction without needing a colour to be
 * seen — which is also how it reads for someone who cannot distinguish the two
 * greens.
 */
export function auditChangeSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  const keys = Object.keys(metadata);
  if (keys.length === 0) return "";

  const shown = keys.slice(0, CHANGES_SHOWN).map((field) => {
    const value = metadata[field];
    if (!isChange(value)) return `${field}: ${String(value ?? "—")}`;
    return `${field}: ${String(value.from ?? "—")} → ${String(value.to ?? "—")}`;
  });

  const overflow = keys.length - shown.length;
  return overflow > 0 ? `${shown.join("; ")} (+${overflow} more)` : shown.join("; ");
}

/** One audit row in the shape the description names. */
export function auditEntryFields(entry: AuditEntryRecord): Record<string, unknown> {
  return {
    id: entry.id,
    // A person, never an id: the email stands in when the name is missing, and
    // "Unknown" stands in when the actor has been removed from the workspace.
    actor: entry.userName ?? entry.userEmail ?? "Unknown",
    action: entry.action,
    targetType: entry.targetType,
    changes: auditChangeSummary(entry.metadata),
    ipAddress: entry.ipAddress,
    createdAt: entry.createdAt,
  };
}

export const AUDIT_ENTRY_LAYOUT: RecordLayout = {
  key: "crm:audit-entry",
  singular: "Audit entry",
  plural: "Audit entries",
  titleField: "actor",
  fields: [
    { name: "actor", label: "Who", kind: "text", readOnly: true },
    {
      name: "action",
      label: "Action",
      kind: "badge",
      readOnly: true,
      options: ACTION_OPTIONS,
    },
    {
      name: "targetType",
      label: "Record",
      kind: "select",
      readOnly: true,
      options: TARGET_TYPE_OPTIONS,
    },
    { name: "changes", label: "Changes", kind: "text", readOnly: true },
    { name: "ipAddress", label: "IP address", kind: "text", readOnly: true },
    { name: "createdAt", label: "When", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search audit entries…",
    columns: [
      { field: "actor", primary: true, sortable: true },
      { field: "action", width: "w-36 shrink-0" },
      { field: "targetType", width: "w-24 shrink-0" },
      { field: "changes", width: "min-w-[220px] max-w-[360px] truncate" },
      { field: "ipAddress", width: "w-32 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Change", fields: ["actor", "action", "targetType"] },
      { title: "Detail", fields: ["changes"] },
      { title: "Origin", fields: ["ipAddress", "createdAt"] },
    ],
  },
  /*
    An audit entry is the record of an edit, not something anyone edits. A log
    with a form on it is a log nobody can trust.
  */
  form: { sections: [] },
};
