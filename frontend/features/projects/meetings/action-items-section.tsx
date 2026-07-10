"use client";

import { memo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, ArrowRightCircle } from "lucide-react";
import {
  useCreateActionItem, useUpdateActionItem, useDeleteActionItem, useConvertActionItemToTask,
} from "@/hooks/api/projects";
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
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
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

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isConverted ? "text-muted-foreground line-through" : "text-foreground"} truncate`}>
            {item.title}
          </span>
          <ActionItemStatusBadge status={item.status} />
          {item.convertedTicketId != null && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 text-violet-600 border-violet-200">
              → TASK-{item.convertedTicketId}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{assigneeName}</span>
          {item.dueDate && <span>Due {item.dueDate.slice(0, 10)}</span>}
        </div>
      </div>
      {canManage && !isConverted && (
        <div className="flex items-center gap-1 shrink-0">
          {CONVERTIBLE.has(item.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleConvertClick}
              disabled={convertPending}
              title="Convert to task"
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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
    return getUserDisplayName(m) || userId;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Action Items
          {actionItems.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">({actionItems.length})</span>
          )}
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {actionItems.length === 0 ? (
        <EmptyState compact title="No action items" description="Track follow-up tasks from this meeting." />
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card">
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
        onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditItem(null); } }}
        mode={editItem ? "edit" : "create"}
        defaultValues={editItem ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createItem.isPending || updateItem.isPending}
        projectMembers={projectMembers}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this action item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
