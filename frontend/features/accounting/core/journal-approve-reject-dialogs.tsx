"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useApproveJournal,
  useRejectJournal,
} from "@/hooks/api/accounting/core";
import { getErrorMessage } from "@/lib/get-error-message";

export interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
}

export function ApproveDialog({ open, onOpenChange, entryId }: ApproveDialogProps) {
  const [note, setNote] = useState("");
  const approveMutation = useApproveJournal(entryId);

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNote(e.target.value);
  }

  function handleApprove(): void {
    approveMutation.mutate(
      { note: note || undefined },
      {
        onSuccess: () => {
          toast.success("Entry approved");
          onOpenChange(false);
          setNote("");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleClose(isOpen: boolean): void {
    if (!isOpen) setNote("");
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Approve journal entry?</DialogTitle>
          <DialogDescription>
            This entry will be approved and posted to the ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label
            htmlFor="approve-note"
            className="text-xs font-medium text-muted-foreground block mb-1.5"
          >
            Note (optional)
          </label>
          <Input
            id="approve-note"
            value={note}
            onChange={handleNoteChange}
            placeholder="Approval note…"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={approveMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={approveMutation.isPending}
            loadingText="Approving…"
            onClick={handleApprove}
          >
            Approve
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
}

export function RejectDialog({ open, onOpenChange, entryId }: RejectDialogProps) {
  const [note, setNote] = useState("");
  const rejectMutation = useRejectJournal(entryId);

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNote(e.target.value);
  }

  function handleReject(): void {
    rejectMutation.mutate(
      { note: note || undefined },
      {
        onSuccess: () => {
          toast.success("Entry rejected");
          onOpenChange(false);
          setNote("");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleClose(isOpen: boolean): void {
    if (!isOpen) setNote("");
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Reject journal entry?</DialogTitle>
          <DialogDescription>This entry will be returned to draft status.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label
            htmlFor="reject-note"
            className="text-xs font-medium text-muted-foreground block mb-1.5"
          >
            Note (optional)
          </label>
          <Input
            id="reject-note"
            value={note}
            onChange={handleNoteChange}
            placeholder="Reason for rejection…"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={rejectMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            isPending={rejectMutation.isPending}
            loadingText="Rejecting…"
            onClick={handleReject}
            variant="destructive"
          >
            Reject
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
