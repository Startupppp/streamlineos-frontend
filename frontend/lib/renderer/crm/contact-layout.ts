import type { RecordLayout } from "../layout";

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
      { field: "name", primary: true, subtitle: "title" },
      { field: "email" },
      { field: "phone", width: "w-40 shrink-0" },
      { field: "company", width: "w-44 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
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
