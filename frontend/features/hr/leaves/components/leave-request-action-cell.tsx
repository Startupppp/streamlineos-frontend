"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMyApprover } from "@/hooks/api/hr/approvers";

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
 *
 * QA 2026-10-13 P0: a sole owner's request is no longer routed back to them —
 * nobody decides their own leave. It waits pending with no approver, and the row
 * says so instead of pointing them at an Approve button the server refuses.
 */
export function RequestActionCell({ request, isCancelling = false, onCancel }: RequestActionCellProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isPending = (request.status ?? "PENDING") === "PENDING";
  const { data: route } = useMyApprover("leave", { enabled: isPending });

  if (!isPending) return null;

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  function handleConfirmCancel() {
    onCancel(request.id);
    setConfirmOpen(false);
  }

  return (
    <>
      {route?.ownerSelfApproval === true && (
        <span className="text-xs text-muted-foreground">
          No other approver is available — add an HR admin or manager
        </span>
      )}
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
