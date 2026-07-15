"use client";

import { useState } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useDeleteTicket } from "@/hooks/api/projects/tickets";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface TicketQuickActionsProps {
  ticketId: number;
  projectId?: number;
  className?: string;
}

export function TicketQuickActions({
  ticketId,
  projectId,
  className,
}: TicketQuickActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const canDelete = useCan("projects:tickets:delete");

  const deleteTicket = useDeleteTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket deleted"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (!projectId || !canDelete) return null;

  function handleDeleteClick() {
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    deleteTicket.mutate({ ticketId });
    setDeleteDialogOpen(false);
  }

  function handleWrapperMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleWrapperClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className={cn("shrink-0", className)}
      onMouseDown={handleWrapperMouseDown}
      onClick={handleWrapperClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        aria-label="Delete ticket"
        onClick={handleDeleteClick}
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} size={14} />
      </Button>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ticket and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
