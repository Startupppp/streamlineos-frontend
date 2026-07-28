"use client";

import { useState, useCallback, useMemo } from "react";
import { Shield, Pencil, Users, Save } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  useModuleAccessCatalog,
  useModuleRoleGroups,
  useSetModuleGroupPermissions,
  useRenameModuleRoleGroup,
  useDeleteModuleRoleGroup,
  type ModulePermission,
  type ModuleRoleGroup,
  type DataScope,
} from "@/hooks/api/module-access";
import { PageActionPicker } from "@/features/module-access/components/page-action-picker";
import { CreateGroupDialog } from "@/features/module-access/components/create-group-dialog";
import { MemberAssignmentSheet } from "@/features/module-access/components/member-assignment-sheet";
import { OwnershipSection } from "@/features/module-access/components/ownership-section";

type PermDraft = Record<string, DataScope>;

function buildDraft(group: ModuleRoleGroup): PermDraft {
  const out: PermDraft = {};
  for (const p of group.permissions) {
    out[p.permissionKey] = p.scope;
  }
  return out;
}

function draftsEqual(a: PermDraft, b: PermDraft): boolean {
  const keysA = Object.keys(a).filter((k) => a[k] !== "none");
  const keysB = Object.keys(b).filter((k) => b[k] !== "none");
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function GroupDetailSkeleton() {
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

interface DeleteButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

function DeleteButton({ onClick }: DeleteButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      aria-label="Delete group"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={13} />
    </button>
  );
}

interface GroupDetailPanelProps {
  group: ModuleRoleGroup;
  catalog: ModulePermission[];
  moduleKey: string;
  canManage: boolean;
}

function GroupDetailPanel({
  group,
  catalog,
  moduleKey,
  canManage,
}: GroupDetailPanelProps) {
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

  function handleSave() {
    const items = Object.entries(draft)
      .filter(([, scope]) => scope !== "none")
      .map(([permissionKey, scope]) => ({ permissionKey, scope }));
    setPermissions.mutate(
      { groupId: group.id, items },
      {
        onSuccess: () => {
          toast.success(`Permissions saved for "${group.name}"`);
          setSavedBaseline(draft);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleOpenMembers = useCallback(() => setMembersOpen(true), []);
  const handleMembersOpenChange = useCallback(
    (open: boolean) => setMembersOpen(open),
    [],
  );

  const grantedCount = Object.values(draft).filter(
    (s) => s !== "none",
  ).length;

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
                {grantedCount} permissions
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
                  <span>{group.memberCount}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Permissions</span>
                  <span>
                    {grantedCount} of {catalog.length} granted
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

interface GroupListItemProps {
  group: ModuleRoleGroup;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDelete: (group: ModuleRoleGroup) => void;
  onRename: (group: ModuleRoleGroup) => void;
}

function GroupListItem({
  group,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}: GroupListItemProps) {
  const handleSelect = useCallback(() => onSelect(group.id), [group.id, onSelect]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(group.id);
      }
    },
    [group.id, onSelect],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(group);
    },
    [group, onDelete],
  );
  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRename(group);
    },
    [group, onRename],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between cursor-pointer ${
        isSelected ? "bg-muted/50 border-l-2 border-l-primary" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{group.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {group.memberCount} members
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {group.isSystem ? (
          <Badge variant="outline" className="text-[9px] px-1.5">
            System
          </Badge>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRename}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Rename group"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <DeleteButton onClick={handleDelete} />
          </>
        )}
      </div>
    </div>
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
  const groupsQuery = useModuleRoleGroups(moduleKey);
  const renameGroup = useRenameModuleRoleGroup(moduleKey);
  const deleteGroup = useDeleteModuleRoleGroup(moduleKey);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRoleGroup | null>(null);
  const [renameTarget, setRenameTarget] = useState<ModuleRoleGroup | null>(null);
  const [renameName, setRenameName] = useState("");

  const groups = groupsQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const handleSelectGroup = useCallback((id: number) => setSelectedGroupId(id), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleGroupCreated = useCallback(
    (id: number) => setSelectedGroupId(id),
    [],
  );
  const handleDeleteDialogClose = useCallback(() => setDeleteTarget(null), []);

  const handleSetDeleteTarget = useCallback(
    (group: ModuleRoleGroup) => setDeleteTarget(group),
    [],
  );
  const handleSetRenameTarget = useCallback((group: ModuleRoleGroup) => {
    setRenameTarget(group);
    setRenameName(group.name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteGroup.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Group deleted");
        if (selectedGroupId === deleteTarget.id) setSelectedGroupId(null);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  }, [deleteGroup, deleteTarget, selectedGroupId]);

  const handleRenameSave = useCallback(() => {
    if (!renameTarget || !renameName.trim()) return;
    renameGroup.mutate(
      { id: renameTarget.id, name: renameName.trim() },
      {
        onSuccess: () => {
          toast.success("Group renamed");
          setRenameTarget(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [renameGroup, renameTarget, renameName]);

  const handleRenameDialogClose = useCallback(
    () => setRenameTarget(null),
    [],
  );

  const handleRenameDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setRenameTarget(null);
    },
    [],
  );

  const handleRenameNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRenameName(e.target.value),
    [],
  );

  const isLoading = catalogQuery.isLoading || groupsQuery.isLoading;
  const isError = catalogQuery.isError || groupsQuery.isError;

  return (
    <PageWrapper
      title={title}
      subtitle={`Manage role groups and permissions for this module.`}
      noInternalScroll
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New group
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <OwnershipSection moduleKey={moduleKey} canManage={canManage} />

        {isLoading ? (
          <GroupDetailSkeleton />
        ) : isError ? (
          <EmptyState
            illustrationPreset="permissions"
            title="Failed to load access configuration"
            description="Check your connection and try again."
            action={{
              label: "Retry",
              onClick: () => {
                void catalogQuery.refetch();
                void groupsQuery.refetch();
              },
            }}
          />
        ) : (
          <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[300px_1fr]">
            <Card className="flex flex-col lg:min-h-0 overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                {groups.length === 0 ? (
                  <EmptyState
                    illustrationPreset="permissions"
                    title="No role groups"
                    description="Create a group to start assigning permissions."
                    action={
                      canManage
                        ? { label: "Create group", onClick: handleOpenCreate }
                        : undefined
                    }
                    compact
                    className="border-0 bg-transparent py-8"
                  />
                ) : (
                  <ScrollArea className="lg:h-full" type="auto">
                    <div className="divide-y divide-border/60">
                      {groups.map((group) => (
                        <GroupListItem
                          key={group.id}
                          group={group}
                          isSelected={selectedGroupId === group.id}
                          onSelect={handleSelectGroup}
                          onDelete={handleSetDeleteTarget}
                          onRename={handleSetRenameTarget}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {selectedGroup && catalog.length > 0 ? (
              <GroupDetailPanel
                key={selectedGroup.id}
                group={selectedGroup}
                catalog={catalog}
                moduleKey={moduleKey}
                canManage={canManage}
              />
            ) : (
              <Card className="flex items-center justify-center min-h-[220px] lg:min-h-0">
                <div className="text-center px-6">
                  <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    Select a group
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a role group to view and edit its permissions
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        moduleKey={moduleKey}
        onCreated={handleGroupCreated}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogClose}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role group</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>?
              Members of this group will lose its permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!renameTarget} onOpenChange={handleRenameDialogOpenChange}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rename group</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            value={renameName}
            onChange={handleRenameNameChange}
            placeholder="Group name"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRenameDialogClose}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRenameSave}
              disabled={renameGroup.isPending || !renameName.trim()}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
