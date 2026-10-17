"use client";

import { useCallback } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { ClipboardCheck, Pencil, Trash2, Unlink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { GoalListItem } from "@/hooks/api/goals";

export interface GoalCardActionsProps {
  goal: GoalListItem;
  onEdit?: (goal: GoalListItem) => void;
  onDelete?: (goal: GoalListItem) => void;
  onUnlink?: (goal: GoalListItem) => void;
  onCheckIn?: (goal: GoalListItem) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalCardActions({
  goal,
  onEdit,
  onDelete,
  onUnlink,
  onCheckIn,
  open,
  onOpenChange,
}: GoalCardActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit?.(goal), [goal, onEdit]);
  const handleDelete = useCallback(() => onDelete?.(goal), [goal, onDelete]);
  const handleUnlink = useCallback(() => onUnlink?.(goal), [goal, onUnlink]);
  const handleCheckIn = useCallback(() => onCheckIn?.(goal), [goal, onCheckIn]);

  const hasProductActions = Boolean(onUnlink || onCheckIn);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Goal actions"
          className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {onCheckIn && goal.keyResultCount > 0 ? (
          <DropdownMenuItem onClick={handleCheckIn}>
            <ClipboardCheck className="h-4 w-4" />
            Check in
          </DropdownMenuItem>
        ) : null}
        {hasProductActions && (onEdit || onDelete) ? (
          <DropdownMenuSeparator />
        ) : null}
        {onUnlink ? (
          <DropdownMenuItem variant="destructive" onClick={handleUnlink}>
            <Unlink className="h-4 w-4 text-destructive" />
            Unlink from product
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
