import type { RecordLayout } from "../layout";

/**
 * Contacts, as data.
 *
 * The field list is derived from what `/contacts` actually sends and what its
 * create and update DTOs actually accept, which is narrower than the hand-written
 * screens believed.
 *
 * Four fields the old surfaces rendered are gone rather than translated.
 * `source`, `status`, `notes` and `ownerId` are declared on the frontend
 * `Contact` type, but the contacts table has no such columns and the reader
 * (`contact-party-reader.ts`) projects none of them — so the Source column
 * rendered an em dash on every row for every contact, and the source filter sent
 * a parameter `listSchema` strips. A generated table cannot hold a column with
 * nothing behind it, which is the point: the description has to name a field,
 * and there was no field to name.
 *
 * Nothing here is `editOnly`: every editable field is accepted by both the create
 * and the update DTO, so nothing appears on edit that create would reject.
 * `organizationName` and `createdAt` are read-only because the API mints them —
 * the first is the linked CRM organisation's name flattened at the surface, since
 * a description cannot reach into a nested relation.
 *
 * `tags` is a comma-separated string in the form and the detail view because the
 * engine has no list-of-strings kind; the surfaces join on the way in and split
 * on the way out.
 */
export const CONTACT_LAYOUT: RecordLayout = {
  key: "crm:contact",
  singular: "Contact",
  plural: "Contacts",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "title", label: "Job title", kind: "text" },
    { name: "department", label: "Department", kind: "text" },
    { name: "company", label: "Company", kind: "text" },
    { name: "organizationName", label: "Organisation", kind: "text", readOnly: true },
    { name: "email", label: "Email", kind: "email" },
    { name: "phone", label: "Phone", kind: "phone" },
    { name: "linkedinUrl", label: "LinkedIn", kind: "url" },
    { name: "twitterUrl", label: "Twitter", kind: "url" },
    { name: "websiteUrl", label: "Website", kind: "url" },
    {
      name: "tags",
      label: "Tags",
      kind: "text",
      hint: "Separate tags with a comma.",
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search contacts…",
    columns: [
      { field: "name", primary: true, sortable: true, subtitle: "title" },
      { field: "email" },
      { field: "phone", width: "w-40 shrink-0" },
      { field: "company", width: "w-44 shrink-0" },
      { field: "createdAt", sortable: true, width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      {
        title: "Person",
        fields: ["name", "title", "department", "company", "organizationName"],
      },
      { title: "Reach", fields: ["email", "phone"] },
      { title: "Profiles", fields: ["linkedinUrl", "twitterUrl", "websiteUrl"] },
      { title: "Record", fields: ["tags", "createdAt"] },
    ],
  },
  form: {
    sections: [
      { title: "Person", fields: ["name", "title", "department", "company"] },
      { title: "Reach", fields: ["email", "phone"] },
      { title: "Profiles", fields: ["linkedinUrl", "twitterUrl", "websiteUrl"] },
      { title: "Tags", fields: ["tags"] },
    ],
  },
};
