import { isPast, isToday } from "date-fns";
import type { RecordLayout, SelectOption } from "../layout";


export const DEFAULT_ACTIVITY_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Task" },
];

export const ACTIVITY_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "overdue", label: "Overdue", tone: "danger" },
  { value: "completed", label: "Completed", tone: "success" },
  { value: "cancelled", label: "Cancelled", tone: "neutral" },
];

export const ACTIVITY_LAYOUT: RecordLayout = {
  key: "crm:activity",
  singular: "Activity",
  plural: "Activities",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    {
      name: "type",
      label: "Activity type",
      kind: "select",
      options: DEFAULT_ACTIVITY_TYPE_OPTIONS,
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: ACTIVITY_STATUS_OPTIONS,
    },
    {
      name: "entityType",
      label: "Related to",
      kind: "select",
      hint: "Leave blank to log an activity that stands on its own.",
      options: [
        { value: "LEAD", label: "Lead" },
        { value: "DEAL", label: "Deal" },
        { value: "CONTACT", label: "Contact" },
      ],
    },
    { name: "entityId", label: "Record", kind: "number" },
    { name: "dueDate", label: "Due", kind: "date" },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "completedAt", label: "Completed", kind: "dateTime", readOnly: true },
    { name: "createdAt", label: "Logged", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search activities…",
    columns: [
      { field: "title", primary: true, subtitle: "notes" },
      { field: "type", width: "w-28 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "entityType", width: "w-24 shrink-0" },
      { field: "dueDate", width: "w-32 shrink-0" },
      { field: "createdAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Activity", fields: ["title", "type", "status"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "When", fields: ["dueDate", "completedAt", "createdAt"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Activity", fields: ["type", "title"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "When and what", fields: ["dueDate", "notes"] },
    ],
  },
};

export function activityLayoutWithTypes(types: readonly SelectOption[]): RecordLayout {
  return {
    ...ACTIVITY_LAYOUT,
    fields: ACTIVITY_LAYOUT.fields.map((field) =>
      field.name === "type" ? { ...field, options: types } : field,
    ),
  };
}

export function activityTypeOptions(
  declared: readonly { readonly key: string; readonly label: string }[] | undefined,
): SelectOption[] {
  const known = new Set(DEFAULT_ACTIVITY_TYPE_OPTIONS.map((option) => option.value));
  const matched = (declared ?? [])
    .filter((option) => known.has(option.key))
    .map((option) => ({ value: option.key, label: option.label }));

  return matched.length > 0 ? matched : [...DEFAULT_ACTIVITY_TYPE_OPTIONS];
}

export interface ActivityRecord {
  readonly id: number;
  readonly title: string;
  readonly notes: string | null;
  readonly type: string;
  readonly status: string;
  readonly entityType: string | null;
  readonly entityId: number | null;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string | null;
}

export function activityStatus(activity: ActivityRecord): string {
  if (activity.status === "completed") return "completed";
  if (activity.status === "cancelled") return "cancelled";
  if (!activity.dueDate) return "pending";

  const due = new Date(activity.dueDate);
  if (Number.isNaN(due.getTime())) return "pending";
  return isPast(due) && !isToday(due) ? "overdue" : "pending";
}

export function activityRecordFields(activity: ActivityRecord): Record<string, unknown> {
  return {
    id: activity.id,
    title: activity.title,
    notes: activity.notes,
    type: activity.type,
    status: activityStatus(activity),
    entityType: activity.entityType,
    entityId: activity.entityId,
    dueDate: activity.dueDate,
    completedAt: activity.completedAt,
    createdAt: activity.createdAt,
  };
}
