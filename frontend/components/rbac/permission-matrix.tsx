"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Lock,
  Loader2,
  Save,
  RotateCcw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import {
  useRolePermissionGrants,
  useSetRolePermissions,
} from "@/hooks/api/roles";
import { useAccess } from "@/hooks/api/access";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";
import {
  type EditableScope,
  type ScopeMap,
  CATALOG,
  scopeMapsEqual,
  toEditableScope,
} from "./permission-matrix-types";
import { ModuleSection } from "./permission-matrix-row";

interface PermissionMatrixProps {
  role: Role;
  onOpenAssignments: () => void;
}

export function PermissionMatrix({
  role,
  onOpenAssignments,
}: PermissionMatrixProps) {
  const grantsQuery = useRolePermissionGrants(role.id);
  const access = useAccess();
  const setRolePermissions = useSetRolePermissions();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [draft, setDraft] = useState<{ roleId: number; map: ScopeMap } | null>(
    null,
  );

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
    draft !== null &&
    draft.roleId === role.id &&
    !scopeMapsEqual(draft.map, baseline);
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
      const catalogModule = CATALOG.find(
        (entry) => entry.moduleKey === moduleKey,
      );
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
    void grantsQuery.refetch();
  }, [grantsQuery]);

  return (
    <Card className="flex flex-col lg:min-h-0 lg:h-full">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TruncatedText text={role.name} className="text-base font-semibold" />
            {role.isSystem && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                System role
              </Badge>
            )}
            {dirty && (
              <Badge className="text-[10px] shrink-0 bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30">
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledTotal} of {PERMISSIONS.length} permissions enabled
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAssignments}
            className="gap-1.5"
          >
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
          System role permissions are managed automatically and cannot be
          edited.
        </div>
      )}

      <Separator />

      {grantsQuery.isLoading ? (
        <div className="divide-y divide-border/30">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-3"
            >
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
          <AlertTriangle className="w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load permissions
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getApiError(grantsQuery.error)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <ScrollArea
          className="max-h-[65dvh] lg:max-h-none lg:flex-1 lg:min-h-0"
          type="auto"
        >
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
