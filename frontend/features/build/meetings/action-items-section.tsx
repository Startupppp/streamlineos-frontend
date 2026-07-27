"use client";

import { memo, useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowRightCircle } from "lucide-react";
import { EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  useCreateActionItem, useUpdateActionItem, useDeleteActionItem, useConvertActionItemToTask,
} from "@/hooks/api/build";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActionItemStatusBadge } from "./meeting-badges";
import { ActionItemFormSheet } from "./action-item-form-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { cn } from "@/lib/utils";
import { PM_ROW } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/build/shared/text-overflow";
import type { ActionItem, CreateActionItemInput, UpdateActionItemInput, ProjectMemberRecord } from "@/types/projects";

const CONVERTIBLE = new Set(["open", "in_progress"]);

interface ActionItemRowProps {
  item: ActionItem;
  assigneeName: string;
  canManage: boolean;
  convertPending: boolean;
  onConvert: (item: ActionItem) => void;
  onEdit: (item: ActionItem) => void;
  onDelete: (item: ActionItem) => void;
}

const ActionItemRow = memo(function ActionItemRow({
  item,
  assigneeName,
  canManage,
  convertPending,
  onConvert,
  onEdit,
  onDelete,
}: ActionItemRowProps) {
  const isConverted = item.status === "converted" || item.convertedTicketId != null;
  const handleConvertClick = useCallback(() => onConvert(item), [item, onConvert]);
  const handleEditClick = useCallback(() => onEdit(item), [item, onEdit]);
  const handleDeleteClick = useCallback(() => onDelete(item), [item, onDelete]);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <div className={cn(PM_ROW, "items-start py-2.5")}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              TEXT_ONE_LINE,
              "max-w-[min(100%,22rem)] text-sm font-medium",
              isConverted ? "text-muted-foreground line-through" : "text-foreground",
            )}
            title={item.title}
          >
            {item.title}
          </span>
          <ActionItemStatusBadge status={item.status} />
          {isConverted ? (
            <Badge variant="outline" className="border-primary/30 px-1.5 py-0.5 text-[9px] text-primary">
              Converted to task
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className={cn(TEXT_ONE_LINE, "max-w-[10rem]")}>{assigneeName}</span>
          {item.dueDate ? <span>Due {item.dueDate.slice(0, 10)}</span> : null}
        </div>
      </div>
      {canManage && !isConverted ? (
        <div className="flex shrink-0 items-center gap-1">
          {CONVERTIBLE.has(item.status) ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleConvertClick}
              disabled={convertPending}
              title="Convert to task"
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7" aria-label="Action item menu" {...hoverHandlers}>
                <EllipsisIcon ref={iconRef} size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
});

interface ActionItemsSectionProps {
  projectId: number;
  meetingId: number;
  actionItems: ActionItem[];
  projectMembers: ProjectMemberRecord[];
  canManage: boolean;
}

export function ActionItemsSection({
  projectId, meetingId, actionItems, projectMembers, canManage,
}: ActionItemsSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionItem | null>(null);

  const createItem = useCreateActionItem(projectId, meetingId);
  const updateItem = useUpdateActionItem(projectId, meetingId);
  const deleteItem = useDeleteActionItem(projectId, meetingId);
  const convertItem = useConvertActionItemToTask(projectId, meetingId);

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = projectMembers.find((p) => p.id === userId);
    return getUserDisplayName(m) || "Unknown";
  }

  function handleCreate(input: CreateActionItemInput) {
    createItem.mutate(input, {
      onSuccess: () => { toast.success("Action item added"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUpdate(input: UpdateActionItemInput) {
    updateItem.mutate(input, {
      onSuccess: () => { toast.success("Action item updated"); setEditItem(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Action item deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const handleConvert = useCallback((item: ActionItem) => {
    convertItem.mutate(item.id, {
      onSuccess: () => toast.success("Converted to task"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [convertItem]);

  const handleEditRow = useCallback((item: ActionItem) => setEditItem(item), []);
  const handleDeleteRow = useCallback((item: ActionItem) => setDeleteTarget(item), []);
  const handleOpenCreate = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) { setSheetOpen(false); setEditItem(null); }
  }, []);
  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Action Items
          {actionItems.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">({actionItems.length})</span>
          ) : null}
        </h3>
        {canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1"
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleOpenCreate}
          >
            Add
          </AnimatedIconButton>
        ) : null}
      </div>

      {actionItems.length === 0 ? (
        <EmptyState compact title="No action items" description="Track follow-up tasks from this meeting." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
          {actionItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              assigneeName={memberName(item.assigneeId)}
              canManage={canManage}
              convertPending={convertItem.isPending}
              onConvert={handleConvert}
              onEdit={handleEditRow}
              onDelete={handleDeleteRow}
            />
          ))}
        </div>
      )}

      <ActionItemFormSheet
        open={sheetOpen || !!editItem}
        onOpenChange={handleSheetOpenChange}
        mode={editItem ? "edit" : "create"}
        defaultValues={editItem ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createItem.isPending || updateItem.isPending}
        projectMembers={projectMembers}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this action item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title
                ? `"${deleteTarget.title}" will be permanently deleted.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
