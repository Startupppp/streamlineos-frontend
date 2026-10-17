import type { RecordLayout } from "./layout";

/**
 * A person at a party, and a role a party holds, as data.
 *
 * `PARTY_CONTACT_LAYOUT` mirrors `createContactSchema`/`updateContactSchema` in
 * the backend's party DTOs; a field the API does not accept would be a control
 * whose value is silently dropped. A role is a single free-form label
 * (CUSTOMER, VENDOR, whatever the tenant uses), so its layout is one field.
 */
export const PARTY_CONTACT_LAYOUT: RecordLayout = {
  key: "party:contact",
  singular: "Contact",
  plural: "Contacts",
  titleField: "firstName",
  fields: [
    { name: "firstName", label: "First name", kind: "text", required: true },
    { name: "lastName", label: "Last name", kind: "text" },
    { name: "title", label: "Title", kind: "text" },
    { name: "email", label: "Email", kind: "email" },
    { name: "phone", label: "Phone", kind: "phone" },
    {
      name: "isPrimary",
      label: "Primary contact",
      kind: "boolean",
      options: [
        { value: "true", label: "Primary", tone: "success" },
        { value: "false", label: "Not primary", tone: "neutral" },
      ],
    },
  ],
  list: {
    searchPlaceholder: "Search contacts…",
    columns: [
      { field: "firstName", primary: true },
      { field: "lastName" },
      { field: "email" },
      { field: "isPrimary", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Contact", fields: ["firstName", "lastName", "title", "email", "phone", "isPrimary"] }],
  },
  form: {
    sections: [{ title: "Contact", fields: ["firstName", "lastName", "title", "email", "phone", "isPrimary"] }],
  },
};

export const PARTY_ROLE_LAYOUT: RecordLayout = {
  key: "party:role",
  singular: "Role",
  plural: "Roles",
  titleField: "role",
  fields: [{ name: "role", label: "Role", kind: "text", required: true, hint: "For example CUSTOMER, VENDOR or PARTNER." }],
  list: { searchPlaceholder: "Search roles…", columns: [{ field: "role", primary: true }] },
  detail: { sections: [{ title: "Role", fields: ["role"] }] },
  form: { sections: [{ title: "Role", fields: ["role"] }] },
};
