import type { RecordLayout } from "../../layout";

/**
 * An email template, as data.
 *
 * The screen this replaces held two hand-rolled `useForm` calls — one in a
 * dialog for creating, one in a card below the grid for editing — with the same
 * three fields written out twice and the same Zod schema declared inline in the
 * page. Two copies of one form is two places for the character limits to drift,
 * and they already had: the create dialog capped the name at 100 and the edit
 * card capped it at 100 in a different `maxLength` attribute.
 *
 * The variable palette that inserts `{{lead.name}}` into the body is not
 * described here. It is a control, supplied by the surface, for the same reason
 * a person picker is: which variables exist depends on what the tenant's records
 * carry, not on what an email template *is*.
 */
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

/**
 * The variables a template may interpolate, and what they look like filled in.
 *
 * Beside the description rather than inside it: a layout says what a field *is*,
 * and this is a palette of values for one particular control. Kept in one place
 * because the preview and the insert buttons have to agree about the list, and
 * they previously did not — the palette offered twelve and the preview knew
 * twelve, with no structure holding them together.
 */
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
