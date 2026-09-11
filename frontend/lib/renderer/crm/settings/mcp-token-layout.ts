import type { RecordLayout, SelectOption } from "../../layout";

/**
 * A CRM agent token, as data.
 *
 * A token is a standing grant to act on this organisation's CRM without a
 * session, which is why the two decisions on this form are the whole record:
 * what it is called, so it can be recognised in the list and revoked, and what
 * it may read.
 *
 * The description declares no list columns. That is not an omission the way a
 * missing form would be: a token is written once and never listed as a record
 * surface — the settings page shows what has been issued as cards carrying a
 * prefix and a revoke control, and the secret itself is shown once at creation
 * and is not recoverable. There is nothing to put in a table, and
 * `validateLayout` admits a description with no columns precisely so a record
 * you only ever fill in does not have to invent one.
 *
 * `scopeGroup` ships with no options. Which groups exist, what each grants and
 * what each is called live in `features/crm/settings/mcp-scopes.ts` beside the
 * permission keys they resolve to, and `withMcpScopeGroups` fills them in — the
 * same bargain `withDealStages` makes, and for a stronger reason: a scope list
 * restated here would be a second copy of a security decision, and the copy that
 * drifts is the one nobody is looking at.
 */
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
      // Filled from `CRM_MCP_SCOPE_GROUPS` by `withMcpScopeGroups`.
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
  /*
    One unheaded section. The dialog's own title already says what is being
    created, and a heading repeating it over three fields is chrome.
  */
  form: { sections: [{ title: "", fields: ["name", "scopeGroup", "expiresInDays"] }] },
};

/** What `mcp-scopes.ts` publishes, as much of it as the description needs. */
export interface McpScopeGroupOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

/**
 * The description with this build's own scope groups in it.
 *
 * The groups become the field's options, and their explanations become the
 * field's hint — all of them at once rather than only the selected one, because
 * this is a choice somebody makes by comparing. What a token may read is the
 * security-relevant half of the form, and hiding two thirds of that behind the
 * dropdown makes the reader open it three times to find out what they are
 * granting.
 *
 * Untouched when no groups are supplied, so the field renders its stored value
 * rather than an empty dropdown.
 */
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
