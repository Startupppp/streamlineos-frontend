import type { RecordLayout } from "../layout";

/**
 * One of the platform's built-in transactional emails, as data.
 *
 * The platform ships these; an organisation previews them and sends itself a
 * test, never edits one here, so the form is empty. `version` is declared so
 * the column exists; the surface draws it as `v3` through `cells`.
 */
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
