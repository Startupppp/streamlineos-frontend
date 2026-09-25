"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import type { LeaveRequest } from "./leaves-shared";

interface RequestActionCellProps {
  request: LeaveRequest;
  isCancelling?: boolean;
  onCancel: (id: number) => void;
}

/**
 * The only action a requester has on their own leave: withdraw it while it is
 * pending. This cell used to also offer Approve / Reject / Revert on the same
 * rows — every one of them always 403s ("You cannot approve or reject your own
 * leave request"), since this list is the caller's own — and a "View Details"
 * item with no handler. Approvals live in the Approvals tab.
 */
export function RequestActionCell({ request, isCancelling = false, onCancel }: RequestActionCellProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if ((request.status ?? "PENDING") !== "PENDING") return null;

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  function handleConfirmCancel() {
    onCancel(request.id);
    setConfirmOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        disabled={isCancelling}
        onClick={handleOpenConfirm}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Cancel request
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel this leave request?"
        description="The request is withdrawn. You can submit a new one later."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        destructive
        isPending={isCancelling}
        onConfirm={handleConfirmCancel}
      />
    </>
  );
}
