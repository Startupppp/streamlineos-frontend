import type { RecordLayout, SelectOption } from "../../layout";

export const MCP_TOKEN_LAYOUT: RecordLayout = {
  key: "crm:settings:mcp-token",
  singular: "Agent token",
  plural: "Agent tokens",
  titleField: "name",
  fields: [
    {
      name: "name",
      label: "Name",
      kind: "text",
      required: true,
      hint: "How you will recognise it later — “Sales desk agent”.",
    },
    {
      name: "scopeGroup",
      label: "Scope",
      kind: "select",
      required: true,
    },
    {
      name: "expiresInDays",
      label: "Expiry",
      kind: "select",
      required: true,
      options: [
        { value: "30", label: "30 days" },
        { value: "90", label: "90 days" },
        { value: "365", label: "1 year" },
      ],
      hint: "A token stops working on its own at the end of this. There is no “never”.",
    },
  ],
  list: { searchPlaceholder: "", columns: [] },
  detail: {
    sections: [{ title: "Token", fields: ["name", "scopeGroup", "expiresInDays"] }],
  },
  form: { sections: [{ title: "", fields: ["name", "scopeGroup", "expiresInDays"] }] },
};

export interface McpScopeGroupOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

export function withMcpScopeGroups(
  layout: RecordLayout,
  groups: readonly McpScopeGroupOption[],
): RecordLayout {
  if (groups.length === 0) return layout;

  const options: SelectOption[] = groups.map((group) => ({
    value: group.value,
    label: group.label,
  }));
  const hint = groups.map((group) => `${group.label} — ${group.description}`).join(" ");

  return {
    ...layout,
    fields: layout.fields.map((field) =>
      field.name === "scopeGroup" ? { ...field, options, hint } : field,
    ),
  };
}
