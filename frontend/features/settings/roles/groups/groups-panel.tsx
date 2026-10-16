"use client";

import { useState, useCallback } from "react";
import { Users, Shield, Pencil, Settings2, Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  RichPanel,
  RichSectionHeader,
} from "@/components/shared/rich-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDeleteGroup,
  usePrincipalGroups,
  type PrincipalGroup,
} from "@/hooks/api/principal-groups";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupDetailSheet } from "./group-detail-sheet";
import { RenameGroupDialog } from "./rename-group-dialog";

const PAGE_SIZE = 20;

function GroupsTableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

interface GroupRowProps {
  group: PrincipalGroup;
  onRename: (group: PrincipalGroup) => void;
  onManage: (group: PrincipalGroup) => void;
  onDelete: (group: PrincipalGroup) => void;
}

function GroupRow({ group, onRename, onManage, onDelete }: GroupRowProps) {
  const handleRename = useCallback(() => onRename(group), [group, onRename]);
  const handleDelete = useCallback(() => onDelete(group), [group, onDelete]);
  const handleManage = useCallback(() => onManage(group), [group, onManage]);

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {group.name}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 px-1.5 py-0 text-micro font-normal"
          >
            {group.kind === "ORG_UNIT" ? "Org unit" : "Custom"}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {group.roleCount}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {group.kind === "CUSTOM" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            aria-label="Rename group"
            onClick={handleRename}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {group.kind === "CUSTOM" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete group"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          aria-label="Manage group"
          onClick={handleManage}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function GroupsPanel() {
  const pageStack = useCursorPageStack();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PrincipalGroup | null>(null);
  const [detailTarget, setDetailTarget] = useState<PrincipalGroup | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrincipalGroup | null>(null);
  const deleteGroup = useDeleteGroup();

  const { data, isLoading, isError, error } = usePrincipalGroups({
    cursor: pageStack.cursor,
    limit: PAGE_SIZE,
  });
  const groups = data?.data ?? [];
  const pagination = data?.pagination ?? {
    limit: PAGE_SIZE,
    nextCursor: null,
    hasMore: false,
  };

  const handleNextPage = useCallback(() => {
    if (pagination.nextCursor) pageStack.goToNextPage(pagination.nextCursor);
  }, [pageStack, pagination.nextCursor]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRename = useCallback((group: PrincipalGroup) => setRenameTarget(group), []);
  const handleManage = useCallback((group: PrincipalGroup) => {
    setDetailTarget(group);
    setDetailOpen(true);
  }, []);
  const handleRenameClose = useCallback((open: boolean) => {
    if (!open) setRenameTarget(null);
  }, []);
  const handleDetailClose = useCallback((open: boolean) => {
    if (!open) setDetailOpen(false);
  }, []);
  const handleDelete = useCallback((group: PrincipalGroup) => setDeleteTarget(group), []);
  const handleDeleteClose = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    deleteGroup.mutate(
      { groupId: id },
      {
        onSuccess: () => {
          toast.success(`Deleted group "${name}"`);
          setDeleteTarget(null);
          if (detailTarget?.id === id) setDetailOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [deleteGroup, deleteTarget, detailTarget?.id]);

  return (
    <>
      <RichPanel className="flex h-full min-h-0 flex-col">
        <RichSectionHeader
          title="Permission Groups"
          description="Assign roles to groups of members. Members inherit the group's roles."
          action={
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              New group
            </AnimatedIconButton>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <GroupsTableSkeleton />
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-destructive">
              {getErrorMessage(error)}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
              No groups yet. Create one to assign roles to teams or departments.
            </div>
          ) : (
            <div className="space-y-0.5">
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onRename={handleRename}
                  onManage={handleManage}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {(pageStack.hasPrevious || pagination.hasMore) && (
          <CursorPageControls
            page={pageStack.page}
            hasNext={pagination.hasMore}
            onPrevious={pageStack.goToPreviousPage}
            onNext={handleNextPage}
          />
        )}
      </RichPanel>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameGroupDialog
        group={renameTarget}
        open={!!renameTarget}
        onOpenChange={handleRenameClose}
      />
      <GroupDetailSheet
        group={detailTarget}
        open={detailOpen}
        onOpenChange={handleDetailClose}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteClose}
        title="Delete permission group"
        description={
          deleteTarget
            ? `Deleting "${deleteTarget.name}" removes its ${deleteTarget.roleCount === 1 ? "role" : "roles"} from ${deleteTarget.memberCount} ${deleteTarget.memberCount === 1 ? "member" : "members"}. Their direct roles are not affected. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete group"
        destructive
        keepOpenOnConfirm
        isPending={deleteGroup.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
