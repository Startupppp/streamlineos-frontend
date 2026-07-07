"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
          size="sm"
          variant="outline"
          className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
          aria-label="Delete ticket"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-sm font-medium text-destructive mb-1">Delete Ticket</p>
        <p className="text-xs text-muted-foreground mb-3">This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
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
