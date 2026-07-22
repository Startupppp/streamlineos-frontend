"use client";

import { useState } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TicketDetailActionsProps {
  onDelete: () => void;
  isDeleting: boolean;
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
        <p className="text-sm font-medium text-destructive mb-1">Delete Ticket</p>
        <p className="text-xs text-muted-foreground mb-3">This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
