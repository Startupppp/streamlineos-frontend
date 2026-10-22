import type { RecordLayout, SelectOption } from "../../layout";


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

const CHANGES_SHOWN = 3;

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

export function auditEntryFields(entry: AuditEntryRecord): Record<string, unknown> {
  return {
    id: entry.id,
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
      { field: "actor", primary: true },
      { field: "action", width: "w-36 shrink-0" },
      { field: "targetType", width: "w-24 shrink-0" },
      { field: "changes", width: "min-w-[220px] max-w-[360px] truncate" },
      { field: "ipAddress", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Change", fields: ["actor", "action", "targetType"] },
      { title: "Detail", fields: ["changes"] },
      { title: "Origin", fields: ["ipAddress", "createdAt"] },
    ],
  },
  form: { sections: [] },
};
