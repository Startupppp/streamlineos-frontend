import type { RecordLayout } from "../../layout";

/**
 * An outreach sequence, its steps, and who is enrolled in it.
 *
 * Three descriptions, because they are three record types with three endpoints.
 * The sheet this replaces drew all three by hand — a step list with its own
 * inline add form held in `useState`, and an enrolment list with its own badge
 * variant map — and none of the three could be rearranged by a tenant because
 * none of them existed as data.
 */
export const SEQUENCE_LAYOUT: RecordLayout = {
  key: "crm:settings:sequence",
  singular: "Sequence",
  plural: "Sequences",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "entityType",
      label: "Runs on",
      kind: "select",
      required: true,
      options: [
        { value: "lead", label: "Leads" },
        { value: "deal", label: "Deals" },
        { value: "contact", label: "Contacts" },
      ],
    },
    {
      name: "isActive",
      label: "Active",
      kind: "boolean",
      hint: "An inactive sequence enrols nobody new and pauses the ones running.",
      options: [
        { value: "true", label: "Running", tone: "success" },
        { value: "false", label: "Paused", tone: "neutral" },
      ],
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search sequences…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "entityType", width: "w-32 shrink-0" },
      { field: "isActive", width: "w-28 shrink-0" },
      { field: "createdAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Sequence", fields: ["name", "entityType", "isActive"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Sequence", fields: ["name", "description", "entityType"] },
      { title: "Running", fields: ["isActive"] },
    ],
  },
};

/**
 * One step of a sequence.
 *
 * `sortOrder` is read-only: the server appends a step at the end and there is no
 * endpoint that moves one, so a control for it would offer an order the API
 * cannot honour.
 */
export const SEQUENCE_STEP_LAYOUT: RecordLayout = {
  key: "crm:settings:sequence-step",
  singular: "Step",
  plural: "Steps",
  titleField: "stepType",
  fields: [
    { name: "sortOrder", label: "#", kind: "number", readOnly: true },
    {
      name: "stepType",
      label: "Do",
      kind: "select",
      required: true,
      options: [
        { value: "email", label: "Send an email" },
        { value: "call_task", label: "Raise a call task" },
        { value: "whatsapp_task", label: "Raise a WhatsApp task" },
        { value: "wait", label: "Wait" },
      ],
    },
    {
      name: "waitHours",
      label: "Wait first (hrs)",
      kind: "number",
      hint: "How long after the previous step this one runs. Leave blank to run immediately.",
    },
  ],
  list: {
    searchPlaceholder: "Search steps…",
    columns: [
      { field: "sortOrder", width: "w-12 shrink-0" },
      { field: "stepType", primary: true },
      { field: "waitHours", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Step", fields: ["sortOrder", "stepType", "waitHours"] }],
  },
  form: {
    sections: [{ title: "Step", fields: ["stepType", "waitHours"] }],
  },
};

/**
 * A record currently moving through a sequence.
 *
 * Read-only throughout: the only thing a person does to an enrolment is stop it,
 * and stopping is an action on a row rather than a field on a form.
 */
export const SEQUENCE_ENROLLMENT_LAYOUT: RecordLayout = {
  key: "crm:settings:sequence-enrollment",
  singular: "Enrolment",
  plural: "Enrolments",
  titleField: "entityName",
  fields: [
    { name: "entityName", label: "Record", kind: "text", readOnly: true },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      readOnly: true,
      options: [
        { value: "active", label: "Running", tone: "info" },
        { value: "completed", label: "Finished", tone: "success" },
        { value: "stopped", label: "Stopped", tone: "neutral" },
        { value: "failed", label: "Failed", tone: "danger" },
      ],
    },
    { name: "currentStep", label: "Step", kind: "number", readOnly: true },
    { name: "nextRunAt", label: "Next", kind: "dateTime", readOnly: true },
    { name: "stopReason", label: "Stopped because", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search enrolments…",
    columns: [
      { field: "entityName", primary: true },
      { field: "status", width: "w-28 shrink-0" },
      { field: "currentStep", width: "w-20 shrink-0" },
      { field: "nextRunAt", width: "w-44 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Enrolment", fields: ["entityName", "status", "currentStep", "nextRunAt", "stopReason"] },
    ],
  },
  form: { sections: [] },
};
