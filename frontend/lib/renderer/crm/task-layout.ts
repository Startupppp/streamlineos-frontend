import { applyAdjustment } from "../layout-adjustment";
import type { RecordLayout, SelectOption } from "../layout";

/**
 * How late a task is, as a word.
 *
 * The list used to say this with a red left border on the row and a
 * `getDueDateClass` helper that tinted the due date red past its date and amber
 * on the day. A tint is not a value: it does not survive greyscale, it reaches
 * no screen reader, and it lived on one screen — so the next surface showing a
 * due date had to reinvent the same thresholds.
 *
 * `sign` cannot say it, for the reason `daysInStage` carries none on the aging
 * report. A sign tones a number by its direction; what is being judged here is
 * a comparison against today, and a threshold is not a sign.
 *
 * Undefined is a real answer, twice. A task that is no longer pending is not
 * late — finishing something after its date is not a problem the queue still
 * has, which is exactly why the old border was suppressed on a completed row.
 * And a task with no due date has no deadline to be late against; calling that
 * "on time" would be a verdict the data does not support.
 */
export type TaskUrgency = "overdue" | "today" | "upcoming";

const URGENCY_OPTIONS: readonly SelectOption[] = [
  { value: "overdue", label: "Overdue", tone: "danger" },
  { value: "today", label: "Due today", tone: "warning" },
  { value: "upcoming", label: "Upcoming", tone: "neutral" },
];

function startOfDay(moment: Date): number {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()).getTime();
}

export function taskUrgency(
  dueDate: string | null | undefined,
  status: string,
): TaskUrgency | undefined {
  if (status !== "pending" || !dueDate) return undefined;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return undefined;

  const today = startOfDay(new Date());
  const day = startOfDay(due);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

const LINKED_LABELS: Readonly<Record<string, string>> = {
  LEAD: "Lead",
  DEAL: "Deal",
  CONTACT: "Contact",
  PROJECT: "Project",
};

/**
 * What the task is attached to, as one line.
 *
 * `entityType` and `entityId` are two fields because that is how the record
 * stores the link and how the form asks for it. A column per half would spend
 * two columns saying one thing, so the list reads a third field that says it
 * once — the same shape as `severity` on the aging report: the API does not
 * send it, the projection derives it, the description names it.
 *
 * Text rather than `reference`, and that is a limitation rather than a
 * preference. `referenceTo` names one domain for the whole field, and a task's
 * link is polymorphic: this row points at a lead, the next at a deal. The
 * vocabulary has `referenceLabel` for the per-row half of a pointer's *name*
 * and nothing for the per-row half of its *domain*, so where a row goes stays a
 * screen concern and rides in the row menu beside the other per-row controls.
 */
export function linkedRecordText(
  entityType: string | null | undefined,
  entityId: number | null | undefined,
): string {
  if (!entityType || entityId === null || entityId === undefined) return "";
  return `${LINKED_LABELS[entityType] ?? entityType} #${entityId}`;
}

/**
 * Tasks, as data.
 *
 * `assigneeId` is a reference rather than text. The value stored is a member id
 * and nobody knows theirs, so the surface supplies the picker through
 * `RecordForm`'s control slot — who may be assigned depends on the caller's
 * organisation, which is a screen concern rather than a shape one. `member` is
 * not in the route map, so the list renders the name rather than a link;
 * `referenceLabel` is what turns the stored id into that name.
 *
 * Three fields the API never sends are declared here and filled by
 * `taskRecordFields`: `linkedRecord`, `assigneeName` and `urgency`. All three
 * are read-only and none appear on the form — they are things the record
 * already says, said in the shape a list can render.
 */
export const TASK_LAYOUT: RecordLayout = {
  key: "crm:task",
  singular: "Task",
  plural: "Tasks",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    {
      name: "type",
      label: "Type",
      kind: "select",
      options: [
        { value: "CALL", label: "Call" },
        { value: "EMAIL", label: "Email" },
        { value: "MEETING", label: "Meeting" },
        { value: "DEMO", label: "Demo" },
        { value: "FOLLOW_UP", label: "Follow-up" },
        { value: "REMINDER", label: "Reminder" },
        { value: "CUSTOM", label: "Custom" },
      ],
    },
    {
      name: "entityType",
      label: "Related to",
      kind: "select",
      hint: "Leave blank for a task that stands on its own.",
      options: [
        { value: "LEAD", label: "Lead" },
        { value: "DEAL", label: "Deal" },
        { value: "CONTACT", label: "Contact" },
      ],
    },
    { name: "entityId", label: "Record", kind: "text" },
    { name: "linkedRecord", label: "Linked to", kind: "text", readOnly: true },
    {
      name: "assigneeId",
      label: "Assignee",
      kind: "reference",
      referenceTo: "member",
      referenceLabel: "assigneeName",
    },
    { name: "assigneeName", label: "Assignee name", kind: "text", readOnly: true },
    { name: "dueDate", label: "Due", kind: "dateTime" },
    { name: "notes", label: "Notes", kind: "longText" },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      // Mirrors TaskStatus exactly; an option the API never sends renders raw.
      options: [
        { value: "pending", label: "Pending", tone: "info" },
        { value: "completed", label: "Done", tone: "success" },
        { value: "cancelled", label: "Cancelled", tone: "neutral" },
      ],
    },
    {
      name: "urgency",
      label: "Urgency",
      kind: "badge",
      readOnly: true,
      options: URGENCY_OPTIONS,
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search tasks…",
    columns: [
      { field: "title", primary: true, sortable: true, subtitle: "linkedRecord" },
      { field: "type", width: "w-32 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "urgency", width: "w-28 shrink-0" },
      { field: "dueDate", sortable: true, width: "w-44 shrink-0" },
      { field: "assigneeId", width: "min-w-[140px]" },
    ],
  },
  detail: {
    sections: [
      { title: "Task", fields: ["title", "type", "status", "urgency"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "Who and when", fields: ["assigneeId", "dueDate", "createdAt"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Task", fields: ["title", "type"] },
      { title: "Linked", fields: ["entityType", "entityId"] },
      { title: "Who and when", fields: ["assigneeId", "dueDate"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
};

/** The shape the tasks endpoint sends, as much of it as the description names. */
export interface TaskRecord {
  readonly id: number;
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly entityType: string | null;
  readonly entityId: number | null;
  readonly assigneeId: string | null;
  readonly dueDate: string | null;
  readonly notes: string | null;
  readonly createdAt: string | null;
}

/**
 * One task in the shape the description names, derived fields included.
 *
 * The assignee's name is passed in rather than looked up. Which members exist
 * depends on the caller's organisation and on a permission they may not hold,
 * which is a screen concern; a description that fetched would make every
 * consumer, including a test, need a query client. Absent a name the reference
 * falls back to the stored id, which is the engine's documented behaviour: a
 * pointer with no name available is still a pointer.
 */
export function taskRecordFields(
  task: TaskRecord,
  assigneeName?: string | null,
): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    entityType: task.entityType,
    entityId: task.entityId,
    linkedRecord: linkedRecordText(task.entityType, task.entityId),
    assigneeId: task.assigneeId,
    assigneeName: assigneeName ?? "",
    dueDate: task.dueDate,
    notes: task.notes,
    urgency: taskUrgency(task.dueDate, task.status),
    createdAt: task.createdAt,
  };
}

/**
 * The same description with the link already decided.
 *
 * Raised from a lead or a deal, the task's record is not a question — it is the
 * thing the person was looking at. Asking anyway is a form with two controls
 * whose only correct answer is the one already on screen. This reuses the
 * hiding machinery rather than declaring a second layout, so the two cannot
 * drift apart.
 */
export function taskLayoutWithLinkedEntity(): RecordLayout {
  return applyAdjustment(TASK_LAYOUT, {
    layoutKey: TASK_LAYOUT.key,
    hidden: ["entityType", "entityId"],
  });
}
