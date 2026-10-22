import type { RecordLayout } from "./layout";

export const PARTY_LAYOUT: RecordLayout = {
  key: "party",
  singular: "Party",
  plural: "Parties",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "legalName", label: "Legal name", kind: "text" },
    { name: "displayName", label: "Display name", kind: "text" },
    {
      name: "partyType",
      label: "Type",
      kind: "select",
      options: [
        { value: "CUSTOMER", label: "Customer", tone: "info" },
        { value: "VENDOR", label: "Vendor", tone: "success" },
        { value: "PARTNER", label: "Partner", tone: "neutral" },
        { value: "BOTH", label: "Customer & Vendor", tone: "warning" },
      ],
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      editOnly: true,
      options: [
        { value: "active", label: "Active", tone: "success" },
        { value: "inactive", label: "Inactive", tone: "neutral" },
        { value: "blocked", label: "Blocked", tone: "danger" },
      ],
    },
    { name: "email", label: "Email", kind: "email" },
    { name: "phone", label: "Phone", kind: "phone" },
    { name: "website", label: "Website", kind: "url" },
    { name: "taxNumber", label: "Tax number", kind: "text" },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search parties…",
    columns: [
      { field: "name", primary: true, subtitle: "legalName" },
      { field: "partyType", width: "w-36 shrink-0" },
      { field: "email", width: "min-w-[160px]" },
      { field: "phone", width: "min-w-[120px]" },
      { field: "createdAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Identity", fields: ["name", "legalName", "displayName", "partyType", "status"] },
      { title: "Contact", fields: ["email", "phone", "website"] },
      { title: "Commercial", fields: ["taxNumber"] },
      { title: "Notes", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Identity", fields: ["name", "legalName", "displayName", "partyType", "status"] },
      { title: "Contact", fields: ["email", "phone", "website"] },
      { title: "Commercial", fields: ["taxNumber", "notes"] },
    ],
  },
};
