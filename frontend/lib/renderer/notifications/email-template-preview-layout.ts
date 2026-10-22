import type { RecordLayout } from "../layout";

export const EMAIL_TEMPLATE_PREVIEW_LAYOUT: RecordLayout = {
  key: "notifications:email-template-preview",
  singular: "Email template",
  plural: "Email templates",
  titleField: "name",
  fields: [
    { name: "name", label: "Email", kind: "text", readOnly: true },
    { name: "category", label: "Category", kind: "text", readOnly: true },
    { name: "subject", label: "Subject", kind: "text", readOnly: true },
    { name: "version", label: "Version", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search email templates…",
    columns: [
      { field: "name", primary: true },
      { field: "category" },
      { field: "subject" },
      { field: "version", width: "w-20 shrink-0" },
    ],
  },
  detail: { sections: [{ title: "Email", fields: ["name", "category", "subject", "version"] }] },
  form: { sections: [] },
};
