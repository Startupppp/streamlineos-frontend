"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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

  /**
   * `reason` clears once the dialog actually closes, not on click — clearing
   * it inside `handleConfirm` used to run whether the mutation the parent
   * kicked off (via `onConfirm`) succeeded or failed, so a failed submission
   * lost the typed reason with no way to retry it. Adjusted during render
   * (React's prop-change pattern) rather than in an effect, so it takes
   * effect in the same commit `open` changes instead of one render later.
   */
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setReason("");
  }

  const handleConfirm = useCallback(() => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }, [reason, onConfirm]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /**
   * Guards against ESC/backdrop closing mid-mutation, matching
   * `ConfirmDialog`'s `handleControlledOpenChange` — the dialog here is a raw
   * `AlertDialog` because it needs the reason textarea, not that component.
   */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && isPending) return;
      onOpenChange(next);
    },
    [isPending, onOpenChange],
  );

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReason(e.target.value);
    },
    [],
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isPending}
            aria-busy={isPending || undefined}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
