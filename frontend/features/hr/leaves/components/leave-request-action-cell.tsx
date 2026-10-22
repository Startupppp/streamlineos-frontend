"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMyApprover } from "@/hooks/api/hr/approvers";

import type { LeaveRequest } from "./leaves-shared";

interface RequestActionCellProps {
  request: LeaveRequest;
  isCancelling?: boolean;
  onCancel: (id: number) => void;
}

export function RequestActionCell({ request, isCancelling = false, onCancel }: RequestActionCellProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isPending = (request.status ?? "PENDING") === "PENDING";
  const { data: route } = useMyApprover("leave", { enabled: isPending });

  if (!isPending) return null;

  const isSelfApprover = route?.ownerSelfApproval === true && route.approver?.userId === currentUserId;
  const approverHint = !isSelfApprover && route
    ? (route.approver?.name ?? route.queue?.label ?? null)
    : null;
  const showGenericPending = route !== undefined && !isSelfApprover && approverHint === null;

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  function handleConfirmCancel() {
    onCancel(request.id);
    setConfirmOpen(false);
  }

  return (
    <>
      {isSelfApprover && (
        <Button asChild variant="link" size="sm">
          <Link href="/hr/approvals">You are the approver — decide in Action Center</Link>
        </Button>
      )}
      {approverHint !== null && (
        <span className="text-xs text-muted-foreground">Awaiting approval from {approverHint}</span>
      )}
      {showGenericPending && (
        <span className="text-xs text-muted-foreground">Awaiting approval</span>
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
