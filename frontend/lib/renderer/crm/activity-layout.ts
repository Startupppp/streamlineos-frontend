import { isPast, isToday } from "date-fns";
import type { RecordLayout, SelectOption } from "../layout";

/**
 * A logged activity, as data.
 *
 * The activity types are the tenant's own — declared in CRM options, not by us —
 * so the description is completed at the point of use rather than frozen here.
 * That is the same move the issues surface makes with a server-sent layout, and
 * it is what "the layout is data" is for: a select whose options a tenant edits
 * does not need a screen written for it.
 *
 * One description serves the form and the list. The list needs two things the
 * form must never offer — a status the workflow assigns and the instant it was
 * completed — so both are `readOnly`, which is what keeps them out of the
 * generated form while letting a table name them as columns. A second
 * description for the same record would have been the drift this engine exists
 * to prevent.
 */

/**
 * The types the product ships with, in case a tenant has declared none.
 *
 * Declared here rather than left empty because a list has to render a stored
 * `CUSTOM` as a word whether or not the reader's organisation has got around to
 * naming its activity types, and a table showing raw enum values has rendered an
 * identifier at somebody. `activityLayoutWithTypes` replaces these wholesale
 * when the tenant has an opinion.
 */
export const DEFAULT_ACTIVITY_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Task" },
];

/**
 * Where an activity has got to.
 *
 * Overdue is not one of the three states the API stores — it stores pending —
 * but it is the one the reader is looking for, so it is derived and given a
 * tone. Deriving it in the description rather than in a cell is what stops the
 * list and the queue counting overdue differently.
 */
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
      // A workflow assigns this and `POST /tasks/:id/complete` changes it. A
      // control here would be one whose value the API drops.
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
      // Notes ride under the title as a second, quieter line rather than taking
      // a column: they are context for the row, not a value to scan down.
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

/** The description with the tenant's own activity types filled in. */
export function activityLayoutWithTypes(types: readonly SelectOption[]): RecordLayout {
  return {
    ...ACTIVITY_LAYOUT,
    fields: ACTIVITY_LAYOUT.fields.map((field) =>
      field.name === "type" ? { ...field, options: types } : field,
    ),
  };
}

/**
 * The tenant's activity types, or the ones the product ships with.
 *
 * The filter bar, the log dialog and the list all needed this and each had
 * written its own; three copies of one mapping is three chances for a renamed
 * type to appear under two names on one page.
 */
export function activityTypeOptions(
  declared: readonly { readonly key: string; readonly label: string }[] | undefined,
): SelectOption[] {
  const known = new Set(DEFAULT_ACTIVITY_TYPE_OPTIONS.map((option) => option.value));
  const matched = (declared ?? [])
    .filter((option) => known.has(option.key))
    .map((option) => ({ value: option.key, label: option.label }));

  // A tenant that has declared none still needs to be able to log a call.
  return matched.length > 0 ? matched : [...DEFAULT_ACTIVITY_TYPE_OPTIONS];
}

/** The activity row, as much of it as the description names. */
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

/**
 * What the reader should be told, which is not always what is stored.
 *
 * A pending activity whose due date has gone is overdue, and calling it pending
 * is a queue that looks clear when it is not. Today counts as on time — a task
 * due at nine is not late at eight.
 */
export function activityStatus(activity: ActivityRecord): string {
  if (activity.status === "completed") return "completed";
  if (activity.status === "cancelled") return "cancelled";
  if (!activity.dueDate) return "pending";

  const due = new Date(activity.dueDate);
  if (Number.isNaN(due.getTime())) return "pending";
  return isPast(due) && !isToday(due) ? "overdue" : "pending";
}

/** One activity in the shape the description names, derived status included. */
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
