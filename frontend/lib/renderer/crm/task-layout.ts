import { applyAdjustment } from "../layout-adjustment";
import type { RecordLayout, SelectOption } from "../layout";

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

export function linkedRecordText(
  entityType: string | null | undefined,
  entityId: number | null | undefined,
): string {
  if (!entityType || entityId === null || entityId === undefined) return "";
  return `${LINKED_LABELS[entityType] ?? entityType} #${entityId}`;
}

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
    {
      name: "entityId",
      label: "Linked record",
      kind: "reference",
      referenceToField: "entityType",
      referenceLabel: "linkedRecord",
    },
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
      { field: "title", primary: true },
      { field: "type", width: "w-32 shrink-0" },
      { field: "entityId", width: "w-36 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "urgency", width: "w-28 shrink-0" },
      { field: "dueDate", width: "w-44 shrink-0" },
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

export function taskLayoutWithLinkedEntity(): RecordLayout {
  return applyAdjustment(TASK_LAYOUT, {
    layoutKey: TASK_LAYOUT.key,
    hidden: ["entityType", "entityId"],
  });
}
