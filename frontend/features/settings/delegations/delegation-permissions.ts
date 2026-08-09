import type { Permission } from "@/lib/rbac/permissions";

const MODULE_LABELS: Record<string, string> = {
  ai: "AI",
  api: "API",
  crm: "CRM",
  hr: "HR",
  kb: "Knowledge Base",
  rbac: "RBAC",
};

export interface DelegationPermissionGroup {
  key: string;
  label: string;
  permissions: Permission[];
}

function moduleLabel(moduleKey: string): string {
  const known = MODULE_LABELS[moduleKey];
  if (known) return known;
  return moduleKey
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function groupDelegationPermissions(
  catalog: Permission[],
  grantableKeys: readonly string[],
  search: string,
): DelegationPermissionGroup[] {
  const grantable = new Set(grantableKeys);
  const query = search.trim().toLowerCase();
  const grouped = new Map<string, Permission[]>();

  for (const permission of catalog) {
    if (!grantable.has(permission.name)) continue;
    if (
      query &&
      !permission.name.toLowerCase().includes(query) &&
      !permission.description.toLowerCase().includes(query)
    ) {
      continue;
    }
    const moduleKey = permission.name.split(":", 1)[0] || "other";
    const permissions = grouped.get(moduleKey) ?? [];
    permissions.push(permission);
    grouped.set(moduleKey, permissions);
  }

  return Array.from(grouped, ([key, permissions]) => ({
    key,
    label: moduleLabel(key),
    permissions: permissions.sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.label.localeCompare(b.label));
}
