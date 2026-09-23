"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import {
  useSetModuleGroupPermissions,
  type ModulePermission,
  type ModuleRoleGroup,
  type DataScope,
} from "@/hooks/api/module-access";
import {
  moduleScopeExplanation,
  moduleScopeLabel,
} from "@/features/module-access/module-scope-label";
import { PageActionPicker } from "@/features/module-access/components/page-action-picker";
import { MemberAssignmentSheet } from "@/features/module-access/components/member-assignment-sheet";

export type PermDraft = Record<string, DataScope>;

export function buildDraft(group: ModuleRoleGroup): PermDraft {
  const out: PermDraft = {};
  for (const p of group.permissions) {
    out[p.permissionKey] = p.scope;
  }
  return out;
}

export function draftsEqual(a: PermDraft, b: PermDraft): boolean {
  const keysA = Object.keys(a).filter((k) => a[k] !== "none");
  const keysB = Object.keys(b).filter((k) => b[k] !== "none");
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

export function GroupDetailSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

interface GroupDetailPanelProps {
  group: ModuleRoleGroup;
  catalog: ModulePermission[];
  moduleKey: string;
  canManage: boolean;
}

export function GroupDetailPanel({
  group,
  catalog,
  moduleKey,
  canManage,
}: GroupDetailPanelProps) {
  const queryClient = useQueryClient();
  const baseline = useMemo(() => buildDraft(group), [group]);
  const [draft, setDraft] = useState<PermDraft>(baseline);
  const [savedBaseline, setSavedBaseline] = useState<PermDraft>(baseline);
  const [membersOpen, setMembersOpen] = useState(false);
  const setPermissions = useSetModuleGroupPermissions(moduleKey);

  const isDirty = !draftsEqual(draft, savedBaseline);

  const handleDraftChange = useCallback(
    (next: PermDraft) => setDraft(next),
    [],
  );

  const handleReset = useCallback(() => setDraft(savedBaseline), [savedBaseline]);

  const handleSave = useCallback(() => {
    if (!canManage || group.isSystem) return;
    const items = Object.entries(draft)
      .filter(([, scope]) => scope !== "none")
      .map(([permissionKey, scope]) => ({ permissionKey, scope }));
    setPermissions.mutate(
      { groupId: group.id, version: group.version, items },
      {
        onSuccess: () => {
          toast.success(`Permissions saved for "${group.name}"`);
          setSavedBaseline(draft);
        },
        onError: (err) => {
          if (isApiError(err) && err.status === 409) {
            toast.error(
              "These permissions were changed by someone else. Reload to see the latest version.",
              {
                action: {
                  label: "Reload",
                  onClick: () => {
                    void queryClient.invalidateQueries({
                      queryKey: directoryAndOwnershipQueryKeys.moduleAccess.roleGroups(moduleKey),
                    });
                  },
                },
              },
            );
          } else {
            toast.error(getErrorMessage(err));
          }
        },
      },
    );
  }, [canManage, draft, group.id, group.isSystem, group.version, group.name, setPermissions, setSavedBaseline, queryClient, moduleKey]);

  const handleOpenMembers = useCallback(() => setMembersOpen(true), []);
  const handleMembersOpenChange = useCallback(
    (open: boolean) => setMembersOpen(open),
    [],
  );

  const grantedCount = Object.values(draft).filter((s) => s !== "none").length;
  const scopeLabel = moduleScopeLabel(moduleKey);

  return (
    <>
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {group.name}
              </CardTitle>
              {group.isSystem && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  System
                </Badge>
              )}
              <Badge variant="outline" className="text-xs shrink-0">
                {grantedCount} of {catalog.length} {scopeLabel} permissions
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleOpenMembers}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                Members ({group.memberCount})
              </Button>
              {!group.isSystem && canManage && isDirty && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleReset}
                    disabled={setPermissions.isPending}
                  >
                    Reset
                  </Button>
                  <LoadingButton
                    size="sm"
                    className="h-7 text-xs"
                    isPending={setPermissions.isPending}
                    loadingText="Saving…"
                    onClick={handleSave}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </LoadingButton>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0 px-4 pb-4">
          <Tabs defaultValue="permissions">
            <TabsList className="mb-3">
              <TabsTrigger value="permissions" className="text-xs">
                Permissions
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">
                About
              </TabsTrigger>
            </TabsList>
            <TabsContent value="permissions">
              <PageActionPicker
                catalog={catalog}
                draft={draft}
                onDraftChange={handleDraftChange}
                readOnly={group.isSystem || !canManage}
              />
            </TabsContent>
            <TabsContent value="info">
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Type</span>
                  <span>{group.isSystem ? "System (read-only)" : "Custom"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Members</span>
                  <span>{group.memberCount} in this group</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Permissions</span>
                  <span>
                    {grantedCount} of {catalog.length} {scopeLabel} permissions granted
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Scope</span>
                  <span className="max-w-prose text-muted-foreground">
                    {moduleScopeExplanation(moduleKey)}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MemberAssignmentSheet
        open={membersOpen}
        onOpenChange={handleMembersOpenChange}
        moduleKey={moduleKey}
        groupId={group.id}
        groupName={group.name}
        canManage={canManage && !group.isSystem}
      />
    </>
  );
}
