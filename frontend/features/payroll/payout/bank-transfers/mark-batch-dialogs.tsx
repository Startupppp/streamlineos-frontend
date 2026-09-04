"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarkBatchSent, useMarkBatchPaid } from "@/hooks/api/payroll/payout-batches";
import { useRunConflictHandler } from "@/features/payroll/shared/run-conflict";
import { toast } from "sonner";

interface MarkBatchSentDialogProps {
  batchId: number | null;
  runId: number;
  onClose: () => void;
}

export function MarkBatchSentDialog({ batchId, runId, onClose }: MarkBatchSentDialogProps) {
  const markSentMutation = useMarkBatchSent();
  const handleError = useRunConflictHandler(runId);

  function handleConfirm() {
    if (batchId === null) return;
    markSentMutation.mutate(
      { batchId, runId },
      {
        onSuccess: () => {
          toast.success("Batch marked as sent");
          onClose();
        },
        onError: handleError,
      },
    );
  }

  return (
    <AlertDialog open={batchId !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Batch as Sent</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm that this payment batch has been submitted to the bank.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              onClick={handleConfirm}
              isPending={markSentMutation.isPending}
              loadingText="Confirming…"
            >
              Confirm
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface MarkBatchPaidDialogProps {
  batchId: number | null;
  runId: number;
  txnRef: string;
  onTxnRefChange: (v: string) => void;
  onClose: () => void;
}

export function MarkBatchPaidDialog({
  batchId,
  runId,
  txnRef,
  onTxnRefChange,
  onClose,
}: MarkBatchPaidDialogProps) {
  const markPaidMutation = useMarkBatchPaid();
  const handleError = useRunConflictHandler(runId);

  function handleSubmit() {
    if (batchId === null || !txnRef.trim()) return;
    markPaidMutation.mutate(
      { batchId, transactionRef: txnRef.trim(), runId },
      {
        onSuccess: () => {
          toast.success("Batch marked as paid");
          onClose();
        },
        onError: handleError,
      },
    );
  }

  return (
    <Dialog open={batchId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark Batch as Paid</DialogTitle>
          <DialogDescription>
            Enter the bank transaction reference for this batch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="batch-txn-ref">Transaction Reference</Label>
          <Input
            id="batch-txn-ref"
            value={txnRef}
            onChange={(e) => onTxnRefChange(e.target.value)}
            placeholder="e.g. NEFT0012345678"
            className=""
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            disabled={!txnRef.trim()}
            isPending={markPaidMutation.isPending}
            loadingText="Confirming…"
          >
            Confirm Paid
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
