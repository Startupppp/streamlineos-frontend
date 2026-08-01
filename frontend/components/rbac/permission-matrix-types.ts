import type { Permission } from "@/lib/rbac/permissions";
import type { DataScope } from "@/types/access";

export type EditableScope = "all" | "team" | "own";

export type ScopeMap = Partial<Record<string, EditableScope>>;

export const MODULE_LABELS: Record<string, string> = {
  hr: "Human Resources",
  crm: "CRM & Sales",
  build: "Build",
  settings: "Settings",
  reports: "Reports",
  accounting: "Accounting",
  dashboard: "Dashboards",
  kb: "Knowledge Base",
  inventory: "Inventory",
  support: "Support",
  self: "Self-Service",
  branch: "Branches",
  dm: "Digital Marketing",
  chat: "Chat",
  payroll: "Payroll",
};

export const SCOPABLE_MODULES = new Set([
  "hr",
  "crm",
  "build",
  "inventory",
  "support",
  "kb",
  "accounting",
]);

export const SCOPABLE_ACTIONS = new Set([
  "view",
  "read",
  "list",
  "update",
  "delete",
  "manage",
  "approve",
  "export",
  "assign",
]);

export const SCOPE_OPTIONS: { value: EditableScope; label: string }[] = [
  { value: "all", label: "All records" },
  { value: "team", label: "Team only" },
  { value: "own", label: "Own only" },
];

export const SCOPE_LABELS: Record<EditableScope, string> = {
  all: "All",
  team: "Team",
  own: "Own",
};

export interface CatalogResource {
  resource: string;
  label: string;
  perms: Permission[];
}

export interface CatalogModule {
  moduleKey: string;
  label: string;
  perms: Permission[];
  resources: CatalogResource[];
}

export function moduleOf(key: string): string {
  return key.split(":")[0] ?? key;
}

export function prettify(value: string): string {
  return value
    .split(/[:\-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function resourceLabel(resource: string, moduleKey: string): string {
  if (resource === moduleKey) return "General";
  const rest = resource.startsWith(`${moduleKey}:`)
    ? resource.slice(moduleKey.length + 1)
    : resource;
  return prettify(rest);
}

export function isScopable(perm: Permission): boolean {
  return (
    SCOPABLE_MODULES.has(moduleOf(perm.name)) &&
    SCOPABLE_ACTIONS.has(perm.action)
  );
}

export function isEditableScope(value: string): value is EditableScope {
  return value === "all" || value === "team" || value === "own";
}

export function toEditableScope(scope: DataScope): EditableScope {
  return isEditableScope(scope) ? scope : "all";
}

export function buildCatalog(permissions: readonly Permission[]): CatalogModule[] {
  const modules = new Map<string, Map<string, Permission[]>>();
  for (const perm of permissions) {
    const key = moduleOf(perm.name);
    let resources = modules.get(key);
    if (!resources) {
      resources = new Map();
      modules.set(key, resources);
    }
    const list = resources.get(perm.resource) ?? [];
    list.push(perm);
    resources.set(perm.resource, list);
  }
  const result: CatalogModule[] = [];
  for (const [moduleKey, resources] of modules) {
    const resourceList: CatalogResource[] = [];
    for (const [resource, perms] of resources) {
      resourceList.push({
        resource,
        label: resourceLabel(resource, moduleKey),
        perms,
      });
    }
    resourceList.sort((a, b) => a.label.localeCompare(b.label));
    result.push({
      moduleKey,
      label: MODULE_LABELS[moduleKey] ?? prettify(moduleKey),
      perms: resourceList.flatMap((entry) => entry.perms),
      resources: resourceList,
    });
  }
  result.sort((a, b) => a.label.localeCompare(b.label));
  return result;
}


export function scopeMapsEqual(a: ScopeMap, b: ScopeMap): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
