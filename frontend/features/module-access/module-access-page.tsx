"use client";

import { useState, useCallback } from "react";
import { ShieldCheck, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { getApiError } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import {
  useModuleAccessCatalog,
  useModuleAccessRoles,
  useSetModuleRolePermissions,
} from "@/hooks/api/module-access";
import type {
  ModulePermission,
  ModuleRoleView,
  DataScope,
} from "@/hooks/api/module-access";
import type { PermissionKey } from "@/lib/rbac/permissions";

type ScopeMap = Record<string, DataScope>;

const SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "team", label: "Team" },
  { value: "own", label: "Own" },
  { value: "none", label: "None" },
];

function buildBaselineMap(role: ModuleRoleView): ScopeMap {
  const map: ScopeMap = {};
  for (const p of role.permissions) {
    map[p.permissionKey] = p.scope;
  }
  return map;
}

function scopeMapsEqual(a: ScopeMap, b: ScopeMap): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

interface RoleCardProps {
  role: ModuleRoleView;
  catalog: ModulePermission[];
  canManage: boolean;
  moduleKey: string;
}

function RoleCard({ role, catalog, canManage, moduleKey }: RoleCardProps) {
  const baseline = buildBaselineMap(role);
  const [draft, setDraft] = useState<ScopeMap>(baseline);
  const [savedBaseline, setSavedBaseline] = useState<ScopeMap>(baseline);
  const mutation = useSetModuleRolePermissions(moduleKey);

  const isReadOnly = role.isSystem || !canManage;
  const dirty = !scopeMapsEqual(draft, savedBaseline);

  function handleCheckboxChange(permKey: string, checked: boolean) {
    setDraft((prev) => {
      const next = { ...prev };
      if (checked) {
        next[permKey] = "all";
      } else {
        next[permKey] = "none";
      }
      return next;
    });
  }

  function handleScopeChange(permKey: string, scope: DataScope) {
    setDraft((prev) => ({ ...prev, [permKey]: scope }));
  }

  function handleReset() {
    setDraft(savedBaseline);
  }

  function handleSave() {
    const items = Object.entries(draft)
      .filter(([, scope]) => scope !== "none")
      .map(([permissionKey, scope]) => ({ permissionKey, scope }));

    mutation.mutate(
      { roleId: role.roleId, items },
      {
        onSuccess: () => {
          toast.success(`Permissions saved for ${role.name}`);
          setSavedBaseline(draft);
        },
        onError: (err) => {
          toast.error(getApiError(err));
        },
      },
    );
  }

  const enabledCount = Object.values(draft).filter((s) => s !== "none").length;

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {role.isSystem && (
            <Lock
              className="size-4 text-muted-foreground shrink-0"
              aria-label="System role — read only"
            />
          )}
          <span className="font-semibold text-sm text-foreground truncate">
            {role.name}
          </span>
          {role.isSystem && (
            <Badge variant="secondary" className="text-xs shrink-0">
              System
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {enabledCount} / {catalog.length}
          </Badge>
          {!isReadOnly && dirty && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={mutation.isPending}
              >
                Reset
              </Button>
              <LoadingButton
                size="sm"
                isPending={mutation.isPending}
                loadingText="Saving…"
                onClick={handleSave}
              >
                <Save className="size-4 mr-1.5" />
                Save
              </LoadingButton>
            </>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {catalog.map((perm) => {
          const permKey = perm.name;
          const currentScope = draft[permKey] ?? "none";
          const isEnabled = currentScope !== "none";

          return (
            <div
              key={permKey}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Checkbox
                  id={`${role.roleId}-${permKey}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(permKey, checked === true)
                  }
                  disabled={isReadOnly}
                  aria-label={`Enable ${perm.name} for ${role.name}`}
                />
                <label
                  htmlFor={`${role.roleId}-${permKey}`}
                  className="text-sm text-foreground leading-tight cursor-pointer select-none min-w-0"
                >
                  <span className="font-medium">{perm.name}</span>
                  {perm.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {perm.description}
                    </span>
                  )}
                </label>
              </div>

              {perm.scopable && isEnabled ? (
                <Select
                  value={currentScope}
                  onValueChange={(v) =>
                    handleScopeChange(permKey, v as DataScope)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="h-8 w-28 text-xs border-input bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {SCOPE_OPTIONS.filter((o) => o.value !== "none").map(
                      (o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground w-28 text-right shrink-0">
                  {isEnabled ? "Granted" : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ModuleAccessPage({
  moduleKey,
  title,
}: {
  moduleKey: string;
  title: string;
}) {
  const canManage = useCan(`${moduleKey}:access:manage` as PermissionKey);
  const catalogQuery = useModuleAccessCatalog(moduleKey);
  const rolesQuery = useModuleAccessRoles(moduleKey);

  const handleRetry = useCallback(() => {
    void catalogQuery.refetch();
    void rolesQuery.refetch();
  }, [catalogQuery, rolesQuery]);

  const isLoading = catalogQuery.isLoading || rolesQuery.isLoading;
  const isError = catalogQuery.isError || rolesQuery.isError;
  const catalog = catalogQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  const moduleName = title.replace(" Access", "");

  return (
    <PageWrapper
      title={title}
      subtitle={`Configure which roles can access ${moduleName} features and at what scope.`}
    >
      {isLoading ? (
        <PageSkeleton />
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <ShieldCheck className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Failed to load access configuration.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          illustrationPreset="permissions"
          title="No roles yet"
          description="Create roles in Settings → Roles and then return here to configure permissions."
        />
      ) : catalog.length === 0 ? (
        <EmptyState
          illustrationPreset="permissions"
          title="No permissions configured"
          description="This module has no permissions in its catalog yet."
        />
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard
              key={role.roleId}
              role={role}
              catalog={catalog}
              canManage={canManage}
              moduleKey={moduleKey}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
