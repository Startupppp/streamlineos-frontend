import type { RecordLayout } from "../../layout";

export const EMAIL_TEMPLATE_LAYOUT: RecordLayout = {
  key: "crm:settings:email-template",
  singular: "Email template",
  plural: "Email templates",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    {
      name: "subject",
      label: "Subject",
      kind: "text",
      required: true,
      hint: "Variables work here too — “Welcome to StreamlineOS, {{lead.name}}”.",
    },
    { name: "body", label: "Body", kind: "longText", required: true },
    { name: "updatedAt", label: "Last changed", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search templates…",
    columns: [
      { field: "name", primary: true },
      { field: "subject" },
      { field: "updatedAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Template", fields: ["name", "subject"] },
      { title: "Body", fields: ["body"] },
    ],
  },
  form: {
    sections: [
      { title: "Template", fields: ["name", "subject"] },
      { title: "Body", fields: ["body"] },
    ],
  },
};

export const EMAIL_TEMPLATE_VARIABLES: ReadonlyArray<{ token: string; sample: string }> = [
  { token: "lead.name", sample: "Rahul Sharma" },
  { token: "lead.email", sample: "rahul@example.com" },
  { token: "lead.phone", sample: "+919876543210" },
  { token: "lead.company", sample: "TechCorp India" },
  { token: "lead.city", sample: "Mumbai" },
  { token: "lead.source", sample: "referral" },
  { token: "lead.potentialValue", sample: "50,00,000" },
  { token: "deal.name", sample: "Enterprise License" },
  { token: "deal.value", sample: "25,00,000" },
  { token: "deal.stage", sample: "Proposal" },
  { token: "user.name", sample: "Priya Patel" },
  { token: "user.email", sample: "priya@streamlineos.app" },
];
