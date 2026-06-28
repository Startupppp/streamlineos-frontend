"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Loader2,
  Save,
  RotateCcw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import {
  useRolePermissionGrants,
  useSetRolePermissions,
} from "@/lib/api/hooks/roles";
import { useAccess } from "@/lib/api/hooks/access";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";
import type { DataScope } from "@/types/access";

type EditableScope = "all" | "team" | "own";

type ScopeMap = Partial<Record<string, EditableScope>>;

const MODULE_LABELS: Record<string, string> = {
  hr: "Human Resources",
  crm: "CRM & Sales",
  projects: "Projects",
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
};

const SCOPABLE_MODULES = new Set(["hr", "crm", "projects", "inventory", "support", "kb"]);
const SCOPABLE_ACTIONS = new Set([
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

const SCOPE_OPTIONS: { value: EditableScope; label: string }[] = [
  { value: "all", label: "All records" },
  { value: "team", label: "Team only" },
  { value: "own", label: "Own only" },
];

const SCOPE_LABELS: Record<EditableScope, string> = {
  all: "All",
  team: "Team",
  own: "Own",
};

interface CatalogResource {
  resource: string;
  label: string;
  perms: Permission[];
}

interface CatalogModule {
  moduleKey: string;
  label: string;
  perms: Permission[];
  resources: CatalogResource[];
}

function moduleOf(key: string): string {
  return key.split(":")[0] ?? key;
}

function prettify(value: string): string {
  return value
    .split(/[:\-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resourceLabel(resource: string, moduleKey: string): string {
  if (resource === moduleKey) return "General";
  const rest = resource.startsWith(`${moduleKey}:`)
    ? resource.slice(moduleKey.length + 1)
    : resource;
  return prettify(rest);
}

function isScopable(perm: Permission): boolean {
  return SCOPABLE_MODULES.has(moduleOf(perm.name)) && SCOPABLE_ACTIONS.has(perm.action);
}

function isEditableScope(value: string): value is EditableScope {
  return value === "all" || value === "team" || value === "own";
}

function toEditableScope(scope: DataScope): EditableScope {
  return isEditableScope(scope) ? scope : "all";
}

function buildCatalog(): CatalogModule[] {
  const modules = new Map<string, Map<string, Permission[]>>();
  for (const perm of PERMISSIONS) {
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
      resourceList.push({ resource, label: resourceLabel(resource, moduleKey), perms });
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

const CATALOG = buildCatalog();

function scopeMapsEqual(a: ScopeMap, b: ScopeMap): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

interface PermissionRowProps {
  perm: Permission;
  enabled: boolean;
  scope: EditableScope;
  scopable: boolean;
  disabled: boolean;
  readOnly: boolean;
  onToggle: (permName: string) => void;
  onSetScope: (permName: string, scope: EditableScope) => void;
}

function PermissionRow({
  perm,
  enabled,
  scope,
  scopable,
  disabled,
  readOnly,
  onToggle,
  onSetScope,
}: PermissionRowProps) {
  const handleToggle = useCallback(() => onToggle(perm.name), [perm.name, onToggle]);
  const handleScopeChange = useCallback(
    (value: string) => {
      if (isEditableScope(value)) onSetScope(perm.name, value);
    },
    [perm.name, onSetScope],
  );

  return (
    <div className="flex items-center justify-between gap-3 px-4 pl-9 py-2 hover:bg-muted/20 transition-colors">
      <label className="flex items-start gap-2.5 min-w-0 cursor-pointer">
        <Checkbox
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
          className="mt-0.5"
          aria-label={perm.description}
        />
        <span className="min-w-0">
          <span className="block text-[13px] leading-tight truncate">{perm.description}</span>
          <span className="block text-[10px] text-muted-foreground font-mono truncate">
            {perm.name}
          </span>
        </span>
      </label>
      {scopable && enabled ? (
        readOnly ? (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {SCOPE_LABELS[scope]}
          </Badge>
        ) : (
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger size="sm" className="h-7 w-[116px] shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <span className="w-[116px] shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

interface ModuleSectionProps {
  module: CatalogModule;
  effective: ScopeMap;
  expanded: boolean;
  locked: boolean;
  readOnly: boolean;
  onToggleExpand: (moduleKey: string) => void;
  onToggleModule: (moduleKey: string, enable: boolean) => void;
  onTogglePermission: (permName: string) => void;
  onSetScope: (permName: string, scope: EditableScope) => void;
}

function ModuleSection({
  module,
  effective,
  expanded,
  locked,
  readOnly,
  onToggleExpand,
  onToggleModule,
  onTogglePermission,
  onSetScope,
}: ModuleSectionProps) {
  const enabledCount = module.perms.filter((perm) => effective[perm.name]).length;
  const allEnabled = enabledCount === module.perms.length && module.perms.length > 0;
  const controlsDisabled = locked || readOnly;

  const handleToggleExpand = useCallback(
    () => onToggleExpand(module.moduleKey),
    [module.moduleKey, onToggleExpand],
  );
  const handleToggleModule = useCallback(
    () => onToggleModule(module.moduleKey, !allEnabled),
    [module.moduleKey, allEnabled, onToggleModule],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{module.label}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {enabledCount}/{module.perms.length}
          </Badge>
          {locked && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 shrink-0 gap-1 text-muted-foreground"
            >
              <Lock className="h-3 w-3" /> Not in plan
            </Badge>
          )}
        </button>
        <Checkbox
          checked={allEnabled}
          onCheckedChange={handleToggleModule}
          disabled={controlsDisabled}
          aria-label={`Toggle all ${module.label} permissions`}
        />
      </div>
      {expanded && (
        <div className="bg-muted/10 border-t border-border/20 pb-1">
          {module.resources.map((resource) => (
            <div key={resource.resource}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {resource.label}
              </p>
              {resource.perms.map((perm) => {
                const scope = effective[perm.name];
                return (
                  <PermissionRow
                    key={perm.name}
                    perm={perm}
                    enabled={Boolean(scope)}
                    scope={scope ?? "all"}
                    scopable={isScopable(perm)}
                    disabled={controlsDisabled}
                    readOnly={readOnly}
                    onToggle={onTogglePermission}
                    onSetScope={onSetScope}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PermissionMatrixProps {
  role: Role;
  onOpenAssignments: () => void;
}

export function PermissionMatrix({ role, onOpenAssignments }: PermissionMatrixProps) {
  const grantsQuery = useRolePermissionGrants(role.id);
  const access = useAccess();
  const setRolePermissions = useSetRolePermissions();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<{ roleId: number; map: ScopeMap } | null>(null);

  const isReadOnly = role.isSystem;

  const baseline = useMemo<ScopeMap>(() => {
    const map: ScopeMap = {};
    for (const grant of grantsQuery.data ?? []) {
      if (grant.scope === "none") continue;
      map[grant.permissionKey] = toEditableScope(grant.scope);
    }
    return map;
  }, [grantsQuery.data]);

  const effective = draft && draft.roleId === role.id ? draft.map : baseline;
  const dirty =
    draft !== null && draft.roleId === role.id && !scopeMapsEqual(draft.map, baseline);
  const enabledTotal = Object.keys(effective).length;

  const setEffective = useCallback(
    (map: ScopeMap) => setDraft({ roleId: role.id, map }),
    [role.id],
  );

  const isModuleLocked = useCallback(
    (moduleKey: string) => access.data?.modules?.[moduleKey] === false,
    [access.data],
  );

  const handleToggleExpand = useCallback((moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  }, []);

  const handleTogglePermission = useCallback(
    (permName: string) => {
      if (isReadOnly) return;
      const next = { ...effective };
      if (next[permName]) delete next[permName];
      else next[permName] = "all";
      setEffective(next);
    },
    [effective, isReadOnly, setEffective],
  );

  const handleSetScope = useCallback(
    (permName: string, scope: EditableScope) => {
      if (isReadOnly) return;
      setEffective({ ...effective, [permName]: scope });
    },
    [effective, isReadOnly, setEffective],
  );

  const handleToggleModule = useCallback(
    (moduleKey: string, enable: boolean) => {
      if (isReadOnly || isModuleLocked(moduleKey)) return;
      const catalogModule = CATALOG.find((entry) => entry.moduleKey === moduleKey);
      if (!catalogModule) return;
      const next = { ...effective };
      for (const perm of catalogModule.perms) {
        if (enable) {
          if (!next[perm.name]) next[perm.name] = "all";
        } else {
          delete next[perm.name];
        }
      }
      setEffective(next);
    },
    [effective, isReadOnly, isModuleLocked, setEffective],
  );

  const handleReset = useCallback(() => setDraft(null), []);

  const handleSave = useCallback(() => {
    const items = Object.entries(effective).flatMap(([permissionKey, scope]) =>
      scope ? [{ permissionKey, scope }] : [],
    );
    setRolePermissions.mutate(
      { roleId: role.id, items },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success("Permissions saved");
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }, [effective, role.id, setRolePermissions]);

  const handleRetry = useCallback(() => {
    grantsQuery.refetch();
  }, [grantsQuery]);

  return (
    <Card className="flex flex-col lg:min-h-0 lg:h-full">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate">{role.name}</h2>
            {role.isSystem && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                System role
              </Badge>
            )}
            {dirty && (
              <Badge className="text-[10px] shrink-0 bg-amber-100 text-amber-800 border-amber-200">
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledTotal} of {PERMISSIONS.length} permissions enabled
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onOpenAssignments} className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Members
          </Button>
          {dirty && !isReadOnly && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={setRolePermissions.isPending}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={setRolePermissions.isPending}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {setRolePermissions.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          System role permissions are managed automatically and cannot be edited.
        </div>
      )}

      <Separator />

      {grantsQuery.isLoading ? (
        <div className="divide-y divide-border/30">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-10 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : grantsQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load permissions</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getApiError(grantsQuery.error)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <ScrollArea className="max-h-[65vh] lg:max-h-none lg:flex-1 lg:min-h-0" type="auto">
          <div className="divide-y divide-border/30">
            {CATALOG.map((module) => (
              <ModuleSection
                key={module.moduleKey}
                module={module}
                effective={effective}
                expanded={expandedModules.has(module.moduleKey)}
                locked={Boolean(isModuleLocked(module.moduleKey))}
                readOnly={isReadOnly}
                onToggleExpand={handleToggleExpand}
                onToggleModule={handleToggleModule}
                onTogglePermission={handleTogglePermission}
                onSetScope={handleSetScope}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
