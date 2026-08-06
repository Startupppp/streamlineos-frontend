"use client";

import { useState, useCallback } from "react";
import { Shield, Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useModuleAccessCatalog,
  useModuleRoleGroups,
  useRenameModuleRoleGroup,
  useDeleteModuleRoleGroup,
  type ModuleRoleGroup,
} from "@/hooks/api/module-access";
import { CreateGroupDialog } from "@/features/module-access/components/create-group-dialog";
import {
  GroupDetailPanel,
  GroupDetailSkeleton,
} from "@/features/module-access/components/group-detail-panel";

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

interface RolesTabProps {
  moduleKey: string;
  canManage: boolean;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  hideToolbar?: boolean;
}

export function RolesTab({
  moduleKey,
  canManage,
  createOpen: createOpenProp,
  onCreateOpenChange,
  hideToolbar = false,
}: RolesTabProps) {
  const catalogQuery = useModuleAccessCatalog(moduleKey);
  const groupsQuery = useModuleRoleGroups(moduleKey);
  const renameGroup = useRenameModuleRoleGroup(moduleKey);
  const deleteGroup = useDeleteModuleRoleGroup(moduleKey);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRoleGroup | null>(null);
  const [renameTarget, setRenameTarget] = useState<ModuleRoleGroup | null>(null);
  const [renameName, setRenameName] = useState("");

  const createOpen = onCreateOpenChange ? (createOpenProp ?? false) : internalCreateOpen;
  const setCreateOpen = onCreateOpenChange ?? setInternalCreateOpen;

  const groups = groupsQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const handleSelectGroup = useCallback((id: number) => setSelectedGroupId(id), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), [setCreateOpen]);
  const handleGroupCreated = useCallback((id: number) => setSelectedGroupId(id), []);
  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setDeleteTarget(null);
    },
    [],
  );
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

  const handleRenameDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setRenameTarget(null);
    },
    [],
  );

  const handleRenameDialogClose = useCallback(() => setRenameTarget(null), []);
  const handleRenameNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRenameName(e.target.value),
    [],
  );

  const isLoading = catalogQuery.isLoading || groupsQuery.isLoading;
  const isError = catalogQuery.isError || groupsQuery.isError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {canManage && !hideToolbar ? (
        <div className="flex justify-end">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New group
          </AnimatedIconButton>
        </div>
      ) : null}

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
                <p className="text-sm font-medium text-foreground">Select a group</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a role group to view and edit its permissions
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        moduleKey={moduleKey}
        onCreated={handleGroupCreated}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete role group"
        description={`Delete "${deleteTarget?.name ?? ""}"? Members of this group will lose its permissions.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteGroup.isPending}
        onConfirm={handleDeleteConfirm}
      />

      <Dialog open={!!renameTarget} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={handleRenameNameChange}
            placeholder="Group name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleRenameDialogClose}>
              Cancel
            </Button>
            <LoadingButton
              onClick={handleRenameSave}
              isPending={renameGroup.isPending}
              disabled={renameGroup.isPending || !renameName.trim()}
            >
              Rename
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
