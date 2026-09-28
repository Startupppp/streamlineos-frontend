"use client";

import { useCallback, useState } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useDeleteTicket, useBulkUpdateTickets } from "@/hooks/api/build/ticket-create-rank-mutations";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { formatTicketKey, getTicketDetailHref } from "@/components/shared/format-ticket-key";

interface TicketQuickActionsProps {
  ticketId: number;
  projectId?: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
  onOpen?: (ticketId: number) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TicketQuickActions({
  ticketId,
  projectId,
  projectKey,
  ticketNumber,
  onOpen,
  className,
  open,
  onOpenChange,
}: TicketQuickActionsProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const canDelete = useCan("build:tickets:delete");
  const canUpdate = useCan("build:tickets:update");

  const deleteTicket = useDeleteTicket(projectId ?? 0, {
    onSuccess: () => toast.success("Ticket deleted"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const bulkUpdate = useBulkUpdateTickets(projectId ?? 0);

  const menuOpen = open ?? uncontrolledOpen;
  const setMenuOpen = onOpenChange ?? setUncontrolledOpen;

  const handleOpenTicket = useCallback(() => {
    onOpen?.(ticketId);
    setMenuOpen(false);
  }, [onOpen, ticketId, setMenuOpen]);

  const handleCopyLink = useCallback(() => {
    if (projectId === undefined || ticketNumber == null) return;
    const href = getTicketDetailHref(projectId, projectKey, ticketNumber);
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void navigator.clipboard?.writeText(`${origin}${href}`);
    toast.success("Link copied");
    setMenuOpen(false);
  }, [projectId, projectKey, ticketNumber, setMenuOpen]);

  const handleCopyKey = useCallback(() => {
    void navigator.clipboard?.writeText(formatTicketKey(projectKey, ticketNumber, ticketId));
    toast.success("Key copied");
    setMenuOpen(false);
  }, [projectKey, ticketNumber, ticketId, setMenuOpen]);

  const handleArchiveClick = useCallback(() => {
    setArchiveDialogOpen(true);
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleArchiveConfirm = useCallback(() => {
    bulkUpdate.mutate(
      { ticketIds: [ticketId], archive: true },
      {
        onSuccess: (result) => {
          if (result.updated === 0) {
            toast.error(
              "This ticket has active sub-tickets, so it was not archived. Archive or move them first.",
            );
            return;
          }
          toast.success("Ticket archived");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setArchiveDialogOpen(false);
  }, [bulkUpdate, ticketId]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleDeleteConfirm = useCallback(() => {
    deleteTicket.mutate({ ticketId });
    setDeleteDialogOpen(false);
  }, [deleteTicket, ticketId]);

  function handleWrapperMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleWrapperClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  if (!projectId) return null;
  const canCopy = ticketNumber != null;
  if (!canUpdate && !canDelete && !onOpen && !canCopy) return null;

  return (
    <div
      className={cn("shrink-0", className)}
      onMouseDown={handleWrapperMouseDown}
      onClick={handleWrapperClick}
      onKeyDown={handleWrapperClick}
    >
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label="Ticket actions"
            {...hoverHandlers}
          >
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onOpen ? (
            <DropdownMenuItem onSelect={handleOpenTicket}>Open</DropdownMenuItem>
          ) : null}
          {canCopy ? (
            <DropdownMenuItem onSelect={handleCopyLink}>Copy link</DropdownMenuItem>
          ) : null}
          {canCopy ? (
            <DropdownMenuItem onSelect={handleCopyKey}>Copy key</DropdownMenuItem>
          ) : null}
          {canUpdate ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleArchiveClick}>Archive</DropdownMenuItem>
            </>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onSelect={handleDeleteClick}>
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive ticket?"
        description="The ticket leaves this board and keeps its comments, attachments and history. A ticket with active sub-tickets cannot be archived."
        confirmLabel="Archive"
        isPending={bulkUpdate.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete ticket?"
        description="This action cannot be undone. Its comments, attachments, assignees, worklogs and links are destroyed. Archive it instead to keep them."
        confirmLabel="Delete"
        destructive
        isPending={deleteTicket.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
