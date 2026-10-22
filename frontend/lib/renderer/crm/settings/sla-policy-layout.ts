import type { RecordLayout } from "../../layout";

export const SLA_POLICY_LAYOUT: RecordLayout = {
  key: "crm:settings:sla-policy",
  singular: "SLA policy",
  plural: "SLA policies",
  titleField: "name",
  fields: [
    { name: "name", label: "Policy", kind: "text", required: true },
    {
      name: "appliesTo",
      label: "Applies to",
      kind: "select",
      required: true,
      options: [
        { value: "lead", label: "Leads" },
        { value: "deal", label: "Deals" },
        { value: "both", label: "Leads and deals" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      kind: "badge",
      required: true,
      options: [
        { value: "low", label: "Low", tone: "neutral" },
        { value: "medium", label: "Medium", tone: "info" },
        { value: "high", label: "High", tone: "warning" },
        { value: "urgent", label: "Urgent", tone: "danger" },
      ],
    },
    {
      name: "firstResponseHours",
      label: "First response (hrs)",
      kind: "number",
      required: true,
      hint: "How long the team has to answer before the clock is breached.",
    },
    {
      name: "resolutionHours",
      label: "Resolution (hrs)",
      kind: "number",
      required: true,
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search policies…",
    columns: [
      { field: "name", primary: true },
      { field: "appliesTo", width: "w-36 shrink-0" },
      { field: "priority", width: "w-28 shrink-0" },
      { field: "firstResponseHours", width: "w-36 shrink-0" },
      { field: "resolutionHours", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Policy", fields: ["name", "appliesTo", "priority"] },
      { title: "Commitments", fields: ["firstResponseHours", "resolutionHours"] },
    ],
  },
  form: {
    sections: [
      { title: "Policy", fields: ["name", "appliesTo", "priority"] },
      { title: "Commitments", fields: ["firstResponseHours", "resolutionHours"] },
    ],
  },
};

export const SLA_BREACH_LAYOUT: RecordLayout = {
  key: "crm:settings:sla-breach",
  singular: "Breach",
  plural: "Breaches",
  titleField: "name",
  fields: [
    { name: "name", label: "Lead", kind: "text", readOnly: true },
    { name: "status", label: "Status", kind: "text", readOnly: true },
    { name: "slaDeadline", label: "Deadline missed", kind: "dateTime", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search breaches…",
    columns: [
      { field: "name", primary: true },
      { field: "status", width: "w-32 shrink-0" },
      { field: "slaDeadline", width: "w-48 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Breach", fields: ["name", "status", "slaDeadline"] }],
  },
  form: { sections: [] },
};
