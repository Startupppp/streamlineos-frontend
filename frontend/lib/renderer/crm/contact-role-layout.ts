import type { RecordLayout } from "../layout";

export const CONTACT_ROLE_LAYOUT: RecordLayout = {
  key: "crm:contact-role",
  singular: "Role",
  plural: "Roles",
  titleField: "roleKey",
  fields: [
    {
      name: "entityId",
      label: "Deal or company",
      kind: "reference",
      required: true,
      hint: "The deal or account this role applies to.",
    },
    {
      name: "roleKey",
      label: "Role",
      kind: "badge",
      required: true,
      options: [
        { value: "decision_maker", label: "Decision maker", tone: "info" },
        { value: "economic_buyer", label: "Economic buyer", tone: "info" },
        { value: "champion", label: "Champion", tone: "success" },
        { value: "blocker", label: "Blocker", tone: "danger" },
        { value: "influencer", label: "Influencer", tone: "neutral" },
        { value: "user", label: "User", tone: "neutral" },
      ],
    },
    {
      name: "isPrimary",
      label: "Primary contact",
      kind: "boolean",
      options: [
        { value: "true", label: "Primary", tone: "success" },
        { value: "false", label: "Not primary", tone: "neutral" },
      ],
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search roles…",
    columns: [
      { field: "roleKey", primary: true },
      { field: "isPrimary", width: "w-28 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Role", fields: ["roleKey", "isPrimary"] },
      { title: "Record", fields: ["createdAt"] },
    ],
  },
  form: {
    sections: [{ title: "Role", fields: ["entityId", "roleKey", "isPrimary"] }],
  },
};

export type ContactRoleEntityType = "deal" | "company";

export function packEntityRef(entityType: ContactRoleEntityType, entityId: number): string {
  return `${entityType}:${entityId}`;
}

export function unpackEntityRef(
  value: string,
): { entityType: ContactRoleEntityType; entityId: number } | undefined {
  const [kind, rawId] = value.split(":");
  if (kind !== "deal" && kind !== "company") return undefined;

  const entityId = Number(rawId);
  if (!Number.isInteger(entityId) || entityId <= 0) return undefined;

  return { entityType: kind, entityId };
}
