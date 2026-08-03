"use client";

import { useState } from "react";
import {
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";

import type { LeaveRequest } from "./leaves-shared";

interface RequestActionCellProps {
  request: LeaveRequest;
  isAdmin: boolean;
  isSelf: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason?: string) => void;
  onRevert?: (id: number) => void;
  onCancel?: (id: number) => void;
}

export function RequestActionCell({
  request,
  isAdmin,
  isSelf,
  onApprove,
  onReject,
  onRevert,
  onCancel,
}: RequestActionCellProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const status = request.status ?? "PENDING";

  function handleOpenRejectDialog() {
    setRejectDialogOpen(true);
  }

  function handleConfirmReject(reason: string) {
    setRejectDialogOpen(false);
    onReject?.(request.id, reason || undefined);
  }

  function handleCancelRequest() {
    onCancel?.(request.id);
  }

  function handleApproveRequest() {
    onApprove?.(request.id);
  }

  function handleRevertRequest() {
    onRevert?.(request.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            aria-label="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {isSelf && status === "PENDING" && onCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCancelRequest}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Request
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              {status !== "APPROVED" && status !== "CANCELLED" && (
                <DropdownMenuItem
                  onClick={handleApproveRequest}
                  className="text-emerald-600"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              )}
              {status !== "REJECTED" && status !== "CANCELLED" && (
                <DropdownMenuItem
                  onClick={handleOpenRejectDialog}
                  className="text-rose-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              )}
              {(status === "APPROVED" || status === "REJECTED") && (
                <DropdownMenuItem onClick={handleRevertRequest}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert to Pending
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmWithReasonSheet
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Rejection reason"
        reasonPlaceholder="Reason for rejection"
        reasonRequired
        confirmLabel="Reject"
        onConfirm={handleConfirmReject}
      />
    </>
  );
}
