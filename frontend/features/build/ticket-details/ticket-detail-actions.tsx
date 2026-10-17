"use client";

import { useState } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TicketDetailActionsProps {
  onDelete: () => void;
  isDeleting: boolean;
  subtaskCount?: number;
}

interface TicketDetailDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
  subtaskCount?: number;
}

export function deleteTicketWarning(subtaskCount = 0): string {
  if (subtaskCount <= 0) return "This cannot be undone.";
  const noun = subtaskCount === 1 ? "subtask" : "subtasks";
  return `This ticket has ${subtaskCount} ${noun}. They will be kept without a parent. This cannot be undone.`;
}

export function TicketDetailDeleteDialog({
  open,
  onOpenChange,
  onDelete,
  isDeleting,
  subtaskCount,
}: TicketDetailDeleteDialogProps) {
  function handleDeleteConfirm() {
    onDelete();
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Ticket"
      description={deleteTicketWarning(subtaskCount)}
      confirmLabel="Delete"
      destructive
      isPending={isDeleting}
      onConfirm={handleDeleteConfirm}
    />
  );
}

export function TicketDetailActions({ onDelete, isDeleting, subtaskCount }: TicketDetailActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleDeleteConfirm() {
    onDelete();
    setDeleteOpen(false);
  }

  function handleCancelDelete() {
    setDeleteOpen(false);
  }

  return (
    <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 touch-manipulation text-destructive hover:text-destructive sm:h-8 sm:w-8"
          aria-label="Delete ticket"
          {...hoverHandlers}
        >
          <Trash2Icon ref={iconRef} size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="mb-1 text-sm font-medium text-destructive">Delete Ticket</p>
        <p className="mb-3 text-xs text-muted-foreground">{deleteTicketWarning(subtaskCount)}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <LoadingButton
            variant="destructive"
            size="sm"
            className="text-xs"
            isPending={isDeleting}
            loadingText="Deleting..."
            onClick={handleDeleteConfirm}
          >
            Delete
          </LoadingButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
