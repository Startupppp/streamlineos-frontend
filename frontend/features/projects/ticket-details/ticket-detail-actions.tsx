"use client";

import { useState } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TicketDetailActionsProps {
  onDelete: () => void;
  isDeleting: boolean;
}

interface TicketDetailDeleteMenuItemProps {
  onRequestDelete: () => void;
}

interface TicketDetailDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function TicketDetailDeleteMenuItem({ onRequestDelete }: TicketDetailDeleteMenuItemProps) {
  function handleSelect() {
    onRequestDelete();
  }

  return (
    <DropdownMenuItem variant="destructive" onSelect={handleSelect} className="gap-2">
      <Trash2Icon size={14} />
      Delete
    </DropdownMenuItem>
  );
}

export function TicketDetailDeleteDialog({
  open,
  onOpenChange,
  onDelete,
  isDeleting,
}: TicketDetailDeleteDialogProps) {
  function handleDeleteConfirm() {
    onDelete();
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton
            variant="destructive"
            size="sm"
            isPending={isDeleting}
            loadingText="Deleting..."
            onClick={handleDeleteConfirm}
          >
            Delete
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TicketDetailActions({ onDelete, isDeleting }: TicketDetailActionsProps) {
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
        <p className="mb-3 text-xs text-muted-foreground">This cannot be undone.</p>
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
