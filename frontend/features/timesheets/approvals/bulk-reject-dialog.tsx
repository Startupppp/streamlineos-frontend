"use client";

import { useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BulkRejectDialogProps {
  open: boolean;
  count: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export function BulkRejectDialog({
  open,
  count,
  onOpenChange,
  onConfirm,
  isPending,
}: BulkRejectDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = useCallback(() => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  }, [reason, onConfirm]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setReason("");
  }, [onOpenChange]);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReason(e.target.value);
    },
    [],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Reject {count} timesheet{count !== 1 ? "s" : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Members will be notified and can revise and resubmit their timesheets.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="bulk-reject-reason" className="text-xs">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="bulk-reject-reason"
            value={reason}
            onChange={handleReasonChange}
            placeholder="Provide a reason for rejection…"
            className="text-xs resize-none"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim() || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Rejecting…" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
