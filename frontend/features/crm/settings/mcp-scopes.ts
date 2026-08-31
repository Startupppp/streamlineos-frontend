import type { PermissionKey } from "@/lib/rbac/permissions";

export const CRM_MCP_SCOPE_GROUPS = [
  {
    value: "deals",
    label: "Deals only",
    description: "Pipeline reads for deal search and deal detail lookups.",
    scopes: ["crm:deals:read"],
  },
  {
    value: "relationship",
    label: "Relationship desk",
    description: "Deals, parties and activities for account context.",
    scopes: ["crm:deals:read", "party:parties:view", "crm:activities:view"],
  },
  {
    value: "analysis",
    label: "Analysis desk",
    description: "Relationship desk plus CRM report execution.",
    scopes: [
      "crm:deals:read",
      "party:parties:view",
      "crm:activities:view",
      "crm:reports:view",
    ],
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  description: string;
  scopes: readonly PermissionKey[];
}>;

export type CrmMcpScopeGroup = (typeof CRM_MCP_SCOPE_GROUPS)[number]["value"];

export function resolveCrmMcpScopes(value: CrmMcpScopeGroup): string[] {
  const group = CRM_MCP_SCOPE_GROUPS.find((candidate) => candidate.value === value);
  return group ? [...group.scopes] : [...CRM_MCP_SCOPE_GROUPS[0].scopes];
}

export function scopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    "crm:deals:read": "Deals",
    "party:parties:view": "Parties",
    "crm:activities:view": "Activities",
    "crm:reports:view": "Reports",
  };
  return labels[scope] ?? scope;
}
