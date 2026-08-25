"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Lock,
  Save,
  RotateCcw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRolePermissionGrants,
  useSetRolePermissions,
} from "@/hooks/api/roles";
import { useAccess, usePermissionCatalog } from "@/hooks/api/access";
import type { Role } from "@/types/organization";
import {
  type EditableScope,
  type ScopeMap,
  buildCatalog,
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
  const [reviewOpen, setReviewOpen] = useState(false);

  const isReadOnly = role.isSystem;
  const catalogQuery = usePermissionCatalog();
  const permissions = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const catalog = useMemo(() => buildCatalog(permissions), [permissions]);
  const includedPermissions = useMemo(
    () =>
      new Set(
        permissions
          .filter((permission) => permission.baselineScope)
          .map((permission) => permission.name),
      ),
    [permissions],
  );

  const baseline = useMemo<ScopeMap>(() => {
    const map: ScopeMap = {};
    for (const permission of permissions) {
      if (permission.baselineScope) {
        map[permission.name] = permission.baselineScope;
      }
    }
    for (const grant of grantsQuery.data ?? []) {
      if (includedPermissions.has(grant.permissionKey)) continue;
      if (grant.scope === "none") continue;
      map[grant.permissionKey] = toEditableScope(grant.scope);
    }
    return map;
  }, [grantsQuery.data, includedPermissions, permissions]);

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
      if (isReadOnly || includedPermissions.has(permName)) return;
      const next = { ...effective };
      if (next[permName]) delete next[permName];
      else next[permName] = "all";
      setEffective(next);
    },
    [effective, includedPermissions, isReadOnly, setEffective],
  );

  const handleSetScope = useCallback(
    (permName: string, scope: EditableScope) => {
      if (isReadOnly || includedPermissions.has(permName)) return;
      setEffective({ ...effective, [permName]: scope });
    },
    [effective, includedPermissions, isReadOnly, setEffective],
  );

  const handleToggleModule = useCallback(
    (moduleKey: string, enable: boolean) => {
      if (isReadOnly || isModuleLocked(moduleKey)) return;
      const catalogModule = catalog.find(
        (entry) => entry.moduleKey === moduleKey,
      );
      if (!catalogModule) return;
      const next = { ...effective };
      for (const perm of catalogModule.perms) {
        if (enable) {
          if (!next[perm.name]) {
            next[perm.name] = perm.baselineScope ?? "all";
          }
        } else if (perm.baselineScope) {
          next[perm.name] = perm.baselineScope;
        } else {
          delete next[perm.name];
        }
      }
      setEffective(next);
    },
    [catalog, effective, isReadOnly, isModuleLocked, setEffective],
  );

  const handleReset = useCallback(() => setDraft(null), []);

  const pendingChanges = useMemo(() => {
    const keys = new Set([...Object.keys(baseline), ...Object.keys(effective)]);
    const added: string[] = [];
    const removed: string[] = [];
    const rescoped: { key: string; from: EditableScope; to: EditableScope }[] = [];
    for (const key of keys) {
      const before = baseline[key];
      const after = effective[key];
      if (!before && after) added.push(key);
      else if (before && !after) removed.push(key);
      else if (before && after && before !== after)
        rescoped.push({ key, from: before, to: after });
    }
    added.sort();
    removed.sort();
    rescoped.sort((a, b) => a.key.localeCompare(b.key));
    return { added, removed, rescoped };
  }, [baseline, effective]);

  const handleOpenReview = useCallback(() => setReviewOpen(true), []);
  const handleReviewOpenChange = useCallback((open: boolean) => setReviewOpen(open), []);

  const handleSave = useCallback(() => {
    const items = Object.entries(effective).flatMap(
      ([permissionKey, scope]) =>
        scope && !includedPermissions.has(permissionKey)
          ? [{ permissionKey, scope }]
          : [],
    );
    setRolePermissions.mutate(
      { roleId: role.id, version: role.version, items },
      {
        onSuccess: () => {
          setDraft(null);
          setReviewOpen(false);
          toast.success("Permissions saved");
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            toast.error("These permissions were changed by someone else. Reload to see the latest version.", {
              action: { label: "Reload", onClick: () => { void grantsQuery.refetch(); } },
            });
          } else {
            toast.error(getErrorMessage(error));
          }
        },
      },
    );
  }, [
    effective,
    grantsQuery,
    includedPermissions,
    role.id,
    role.version,
    setRolePermissions,
  ]);

  const handleRetry = useCallback(() => {
    void grantsQuery.refetch();
  }, [grantsQuery]);

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TruncatedText text={role.name} className="text-base font-semibold" />
            {role.isSystem && (
              <Badge variant="outline" className="text-micro shrink-0">
                System role
              </Badge>
            )}
            {dirty && (
              <Badge className="text-micro shrink-0 bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledTotal} of {permissions.length} permissions enabled
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
              <LoadingButton
                size="sm"
                onClick={handleOpenReview}
                isPending={setRolePermissions.isPending}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {!setRolePermissions.isPending && <Save className="h-3.5 w-3.5" />}
                Review &amp; save
              </LoadingButton>
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

      {grantsQuery.isLoading || catalogQuery.isLoading ? (
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
      ) : grantsQuery.isError || catalogQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <AlertTriangle className="w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load permissions
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getErrorMessage(grantsQuery.error ?? catalogQuery.error)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <ScrollArea
          className="min-h-0 flex-1 max-h-[65dvh] lg:max-h-none"
          type="auto"
        >
          <div className="divide-y divide-border/30">
            {catalog.map((module) => (
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
      <ConfirmDialog
        open={reviewOpen}
        onOpenChange={handleReviewOpenChange}
        title="Review permission changes"
        description={`These changes apply to every member holding the ${role.name} role.`}
        confirmLabel="Apply changes"
        isPending={setRolePermissions.isPending}
        keepOpenOnConfirm
        onConfirm={handleSave}
        content={<PermissionChangeSummary changes={pendingChanges} />}
      />
    </Card>
  );
}

function PermissionChangeSummary({
  changes,
}: {
  changes: {
    added: string[];
    removed: string[];
    rescoped: { key: string; from: EditableScope; to: EditableScope }[];
  };
}) {
  const { added, removed, rescoped } = changes;
  const total = added.length + removed.length + rescoped.length;

  if (total === 0)
    return (
      <p className="text-label text-muted-foreground">No changes to apply.</p>
    );

  return (
    <div className="max-h-[45dvh] space-y-3 overflow-y-auto text-label">
      {added.length > 0 && (
        <div>
          <p className="font-medium text-status-success-ink">
            Granting {added.length}
          </p>
          <ul className="mt-1 space-y-0.5 font-mono text-dense text-muted-foreground">
            {added.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      )}
      {removed.length > 0 && (
        <div>
          <p className="font-medium text-status-danger-ink">
            Revoking {removed.length}
          </p>
          <ul className="mt-1 space-y-0.5 font-mono text-dense text-muted-foreground">
            {removed.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      )}
      {rescoped.length > 0 && (
        <div>
          <p className="font-medium text-status-warning-ink">
            Changing scope on {rescoped.length}
          </p>
          <ul className="mt-1 space-y-0.5 font-mono text-dense text-muted-foreground">
            {rescoped.map((change) => (
              <li key={change.key}>
                {change.key}: {change.from} → {change.to}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
