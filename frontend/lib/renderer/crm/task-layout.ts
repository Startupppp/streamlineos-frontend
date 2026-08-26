import { applyAdjustment } from "../layout-adjustment";
import type { RecordLayout } from "../layout";

/**
 * Tasks, as data.
 *
 * `assigneeId` is a reference rather than text. The value stored is a member id
 * and nobody knows theirs, so the surface supplies the picker through
 * `RecordForm`'s control slot — who may be assigned depends on the caller's
 * organisation, which is a screen concern rather than a shape one.
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
    {
      name: "assigneeId",
      label: "Assignee",
      kind: "reference",
      referenceTo: "member",
    },
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
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search tasks…",
    columns: [
      { field: "title", primary: true, sortable: true },
      { field: "type", width: "w-32 shrink-0" },
      { field: "status", width: "w-28 shrink-0" },
      { field: "dueDate", sortable: true, width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Task", fields: ["title", "type", "status"] },
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
